// components/WithdrawPanel.tsx 
'use client'
import { useState, useEffect } from 'react'
import { 
  ArrowLeft, Loader2, Coins, AlertTriangle, CheckCircle, ExternalLink
} from 'lucide-react'
import { Contract, BrowserProvider, formatUnits, parseUnits } from 'ethers'
import { CONTRACT_ADDRESSES } from "@/lib/contract-helpers"
import { ANTHEM_VAULT_ABI, SOVEREIGN_POOL_ABI, ERC20_ABI } from '@/lib/abis'

export default function WithdrawPanel() {
  const [lpAmount, setLpAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [userLPTokens, setUserLPTokens] = useState(0)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [vaultLPTokens, setVaultLPTokens] = useState(0)

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        setIsConnected(true)
        try {
          const ethersProvider = new BrowserProvider(window.ethereum)
          setProvider(ethersProvider)
          const accounts = await ethersProvider.listAccounts()
          if (accounts.length > 0) {
            setAddress(accounts[0].address)
            fetchUserPosition(accounts[0].address, ethersProvider)
          }
        } catch (error) {
          console.error('Failed to initialize:', error)
        }
      }
    }
    
    init()
  }, [])

  const fetchUserPosition = async (userAddress: string, ethersProvider: BrowserProvider) => {
    try {
      // Get user's LP tokens from pool
      const poolContract = new Contract(
        CONTRACT_ADDRESSES.SOVEREIGN_POOL,
        SOVEREIGN_POOL_ABI,
        ethersProvider
      )
      
      const lpTokens = await poolContract.balanceOf(userAddress)
      setUserLPTokens(Number(formatUnits(lpTokens, 18)))
      
      // Get vault's LP tokens for context
      const vaultContract = new Contract(
        CONTRACT_ADDRESSES.ANTHEM_VAULT,
        ANTHEM_VAULT_ABI,
        ethersProvider
      )
      
      const vaultLpTokens = await vaultContract.totalLPTokens()
      setVaultLPTokens(Number(formatUnits(vaultLpTokens, 18)))
      
    } catch (error) {
      console.error('Failed to fetch user position:', error)
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to connect your wallet')
      return
    }
    
    try {
      const ethersProvider = new BrowserProvider(window.ethereum)
      const accounts = await ethersProvider.send('eth_requestAccounts', [])
      
      if (accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
        setProvider(ethersProvider)
        fetchUserPosition(accounts[0], ethersProvider)
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      alert('Failed to connect wallet. Please try again.')
    }
  }

  const handleWithdraw = async () => {
    if (!isConnected || !lpAmount || parseFloat(lpAmount) <= 0) {
      alert('Enter valid amount')
      return
    }

    if (parseFloat(lpAmount) > userLPTokens) {
      alert(`Insufficient LP tokens. You have ${userLPTokens.toFixed(4)} LP tokens`)
      return
    }

    setWithdrawing(true)
    try {
      const signer = await provider!.getSigner()
      
      // First approve vault to spend LP tokens
      const poolContract = new Contract(
        CONTRACT_ADDRESSES.SOVEREIGN_POOL,
        ERC20_ABI,
        signer
      )
      
      const lpAmountBN = parseUnits(lpAmount, 18)
      
      // Check and set allowance
      const allowance = await poolContract.allowance(address, CONTRACT_ADDRESSES.ANTHEM_VAULT)
      if (allowance < lpAmountBN) {
        const approveTx = await poolContract.approve(CONTRACT_ADDRESSES.ANTHEM_VAULT, lpAmountBN)
        await approveTx.wait()
        console.log('✅ LP tokens approved')
      }
      
      // Withdraw from vault
      const vaultContract = new Contract(
        CONTRACT_ADDRESSES.ANTHEM_VAULT,
        ANTHEM_VAULT_ABI,
        signer
      )
      
      const tx = await vaultContract.withdraw(lpAmountBN)
      await tx.wait()
      
      alert(`✅ Withdrawal successful! Transaction: ${tx.hash}`)
      
      // Refresh position
      fetchUserPosition(address!, provider!)
      
      setLpAmount('')
      
    } catch (error: any) {
      console.error('Withdrawal failed:', error)
      alert(`❌ Withdrawal failed: ${error.message}\n\nMake sure you have LP tokens from vault deposits.`)
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <div className="glass-card p-4 rounded-xl">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ArrowLeft className="w-5 h-5 text-accent" />
        Withdraw from Vault
      </h2>
      
      {/* Connect Wallet Button if not connected */}
      {!isConnected && (
        <div className="mb-6 p-4 border border-dashed border-gray-700 rounded-lg text-center">
          <p className="text-text-muted mb-3">Connect wallet to withdraw</p>
          <button
            onClick={connectWallet}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700"
          >
            Connect Wallet
          </button>
        </div>
      )}

      {/* Flow Explanation */}
      <div className="mb-6 p-3 rounded-lg bg-accent/10 border border-accent/20">
        <div className="text-sm font-medium mb-2">Withdraw Flow:</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 rounded bg-blue-500/10">
            <Coins className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <div>Burn LP</div>
            <div className="text-text-muted">From Vault</div>
          </div>
          <div className="text-center p-2 rounded bg-green-500/10">
            <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <div>Get Tokens</div>
            <div className="text-text-muted">sANTHEM/jANTHEM</div>
          </div>
          <div className="text-center p-2 rounded bg-purple-500/10">
            <ArrowLeft className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <div>Receive USDC</div>
            <div className="text-text-muted">Redeemed value</div>
          </div>
        </div>
      </div>
      
      {/* Amount Input */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">LP Tokens to Withdraw</label>
          <span className="text-xs text-text-muted">
            Available: {isConnected ? userLPTokens.toFixed(4) : 'Connect wallet'}
          </span>
        </div>
        <input
          type="number"
          value={lpAmount}
          onChange={(e) => setLpAmount(e.target.value)}
          className="input-field w-full"
          placeholder="0.0"
          max={userLPTokens}
          step="0.001"
          disabled={!isConnected}
        />
        {isConnected && (
          <div className="flex gap-2 mt-2">
            {[0.25, 0.5, 0.75, 1].map((percent) => (
              <button
                key={percent}
                onClick={() => setLpAmount((userLPTokens * percent).toFixed(4))}
                className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700"
              >
                {percent * 100}%
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Vault Info */}
      {isConnected && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="text-xs text-text-muted mb-1">Vault LP Tokens: {vaultLPTokens.toFixed(4)}</div>
          <div className="text-xs text-text-muted">
            Your share: {vaultLPTokens > 0 ? ((userLPTokens / vaultLPTokens) * 100).toFixed(2) : '0'}%
          </div>
        </div>
      )}
      
      {/* What Happens */}
      {isConnected && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium">Smart Contract Actions:</span>
          </div>
          <div className="text-xs text-text-muted space-y-1">
            <p>1. Vault burns LP tokens from Sovereign Pool</p>
            <p>2. Vault receives sANTHEM/jANTHEM tokens</p>
            <p>3. Vault redeems tokens for USDC</p>
            <p>4. USDC transferred to your wallet</p>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={isConnected ? handleWithdraw : connectWallet}
        disabled={isConnected && (withdrawing || !lpAmount || parseFloat(lpAmount) > userLPTokens)}
        className="w-full flex items-center justify-center gap-2 btn-primary py-3 disabled:opacity-50"
      >
        {!isConnected ? 'Connect Wallet' : withdrawing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing Withdrawal...</span>
          </>
        ) : (
          <>
            <ArrowLeft className="w-4 h-4" />
            <span>Withdraw (On-chain)</span>
          </>
        )}
      </button>
      
      {/* Contract Link */}
      <div className="mt-4 text-center">
        <a 
          href={`https://sepolia.arbiscan.io/address/${CONTRACT_ADDRESSES.ANTHEM_VAULT}`}
          target="_blank"
          className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          View AnthemVault Contract
        </a>
      </div>
    </div>
  )
}