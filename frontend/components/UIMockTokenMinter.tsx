// components/UIMockTokenMinter.tsx 
'use client'
import { useState, useEffect } from 'react'
import { DollarSign, Bitcoin, Zap, Loader2, Check, ExternalLink, Copy, AlertCircle } from 'lucide-react'
import { BrowserProvider, formatUnits, Contract, Interface } from 'ethers'
import { CONTRACT_ADDRESSES } from '@/lib/contract-helpers'
import { UI_MOCK_USDC_ABI, UI_MOCK_ETH_ABI, UI_MOCK_BTC_ABI } from '@/lib/abis/mock-tokens'

// Create mutable copies of the ABIs
const MUTABLE_UI_MOCK_USDC_ABI = [...UI_MOCK_USDC_ABI] as any[];
const MUTABLE_UI_MOCK_ETH_ABI = [...UI_MOCK_ETH_ABI] as any[];
const MUTABLE_UI_MOCK_BTC_ABI = [...UI_MOCK_BTC_ABI] as any[];

export default function UIMockTokenMinter() {
  const [minting, setMinting] = useState(false)
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'ETH' | 'BTC'>('USDC')
  const [success, setSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [tokenBalances, setTokenBalances] = useState({
    USDC: '0',
    ETH: '0',
    BTC: '0'
  })
  const [error, setError] = useState<string | null>(null)
  const [ethBalance, setEthBalance] = useState('0')
  
  // Connect wallet and get balances
  useEffect(() => {
    const connectAndGetBalances = async () => {
      if (!window.ethereum) return
      
      try {
        const provider = new BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()
        if (accounts.length > 0) {
          setUserAddress(accounts[0].address)
          await fetchBalances(accounts[0].address, provider)
        }
      } catch (error) {
        console.error('Failed to connect:', error)
      }
    }
    
    connectAndGetBalances()
    
    // Listen for account changes
    if (window.ethereum?.on) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setUserAddress(accounts[0])
          const provider = new BrowserProvider(window.ethereum!)
          fetchBalances(accounts[0], provider)
        } else {
          setUserAddress(null)
          setTokenBalances({ USDC: '0', ETH: '0', BTC: '0' })
        }
      }
      
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      
      return () => {
        window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])
  
  const fetchBalances = async (address: string, provider: BrowserProvider) => {
    try {
      // Get ETH balance first
      const ethBal = await provider.getBalance(address)
      setEthBalance(formatUnits(ethBal, 18))
      
      // USDC balance using Contract
      const usdcContract = new Contract(
        CONTRACT_ADDRESSES.UI_MOCK_USDC, 
        MUTABLE_UI_MOCK_USDC_ABI, 
        provider
      )
      const usdcBalance = await usdcContract.balanceOf(address)
      const usdcDecimals = await usdcContract.decimals()
      
      // ETH balance
      const ethContract = new Contract(
        CONTRACT_ADDRESSES.UI_MOCK_ETH, 
        MUTABLE_UI_MOCK_ETH_ABI, 
        provider
      )
      const ethTokenBalance = await ethContract.balanceOf(address)
      const ethDecimals = await ethContract.decimals()
      
      // BTC balance
      const btcContract = new Contract(
        CONTRACT_ADDRESSES.UI_MOCK_BTC, 
        MUTABLE_UI_MOCK_BTC_ABI, 
        provider
      )
      const btcBalance = await btcContract.balanceOf(address)
      const btcDecimals = await btcContract.decimals()
      
      setTokenBalances({
        USDC: formatUnits(usdcBalance, usdcDecimals),
        ETH: formatUnits(ethTokenBalance, ethDecimals),
        BTC: formatUnits(btcBalance, btcDecimals)
      })
    } catch (error) {
      console.error('Failed to fetch balances:', error)
    }
  }

const handleMintTokens = async () => {
  if (!userAddress) {
    // Try to connect wallet
    if (!window.ethereum) {
      alert('Please install MetaMask!')
      return
    }
    
    try {
      const provider = new BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      if (accounts.length > 0) {
        setUserAddress(accounts[0])
        await fetchBalances(accounts[0], provider)
      }
      return
    } catch (error) {
      alert('Failed to connect wallet')
      return
    }
  }
  
  // Check ETH balance for gas
  if (parseFloat(ethBalance) < 0.0001) {
    alert(`❌ Insufficient ETH for gas. You have ${ethBalance} ETH.\n\nGet ETH from:\nhttps://faucet.quicknode.com/arbitrum/sepolia`)
    return
  }
  
  setMinting(true)
  setSuccess(false)
  setError(null)
  setTxHash(null)
  
  try {
    // Get contract address
    let contractAddress: string
    let amount: string
    
    switch(selectedToken) {
      case 'USDC':
        contractAddress = CONTRACT_ADDRESSES.UI_MOCK_USDC
        amount = '10,000'
        break
      case 'ETH':
        contractAddress = CONTRACT_ADDRESSES.UI_MOCK_ETH
        amount = '10'
        break
      case 'BTC':
        contractAddress = CONTRACT_ADDRESSES.UI_MOCK_BTC
        amount = '1'
        break
    }
    
    const provider = new BrowserProvider(window.ethereum!)
    const signer = await provider.getSigner()
    
    // Use the correct ABI based on token
    let abi: any[]
    if (selectedToken === 'USDC') {
      abi = MUTABLE_UI_MOCK_USDC_ABI
    } else if (selectedToken === 'ETH') {
      abi = MUTABLE_UI_MOCK_ETH_ABI
    } else {
      abi = MUTABLE_UI_MOCK_BTC_ABI
    }
    
    // Create contract with signer
    const contract = new Contract(contractAddress, abi, signer)
    
    console.log(`📤 Attempting to mint ${amount} ${selectedToken}...`)
    console.log('Contract address:', contractAddress)
    console.log('User address:', userAddress)
    
    // METHOD 1: Try direct call with explicit gas
    try {
      console.log('Method 1: Direct contract call with explicit gas...')
      
      // First, estimate gas
      const gasEstimate = await contract.faucet.estimateGas()
      console.log('Gas estimate:', gasEstimate.toString())
      
      // Add 20% buffer
      const gasLimit = (gasEstimate * 120n) / 100n
      
      // Call faucet with explicit gas limit
      const tx = await contract.faucet({
        gasLimit: gasLimit
      })
      
      setTxHash(tx.hash)
      console.log('✅ Transaction sent:', tx.hash)
      
      // Wait for confirmation
      const receipt = await tx.wait()
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber)
      console.log('Gas used:', receipt.gasUsed.toString())
      
      setSuccess(true)
      alert(`✅ ${amount} ${selectedToken} minted to your wallet!\n\nTransaction: ${tx.hash}`)
      
      // Open arbiscan in new tab
      const arbiscanLink = `https://sepolia.arbiscan.io/tx/${tx.hash}`
      window.open(arbiscanLink, '_blank')
      
      // Refresh balances after 3 seconds
      setTimeout(async () => {
        await fetchBalances(userAddress, provider)
      }, 3000)
      
    } catch (method1Error: any) {
      console.log('Method 1 failed, trying Method 2...', method1Error)
      
      // METHOD 2: Use raw transaction data
      try {
        console.log('Method 2: Raw transaction data...')
        
        // Create interface and encode function call
        const iface = new Interface(abi)
        const data = iface.encodeFunctionData('faucet', [])
        
        // Send raw transaction
        const tx = await signer.sendTransaction({
          to: contractAddress,
          data: data,
          // Don't set gas limit, let MetaMask estimate
        })
        
        setTxHash(tx.hash)
        console.log('✅ Raw transaction sent:', tx.hash)
        
        // Wait for confirmation
        await tx.wait()
        console.log('✅ Raw transaction confirmed!')
        
        setSuccess(true)
        alert(`✅ ${amount} ${selectedToken} minted!\n\nTransaction: ${tx.hash}`)
        
        const arbiscanLink = `https://sepolia.arbiscan.io/tx/${tx.hash}`
        window.open(arbiscanLink, '_blank')
        
        // Refresh balances
        setTimeout(async () => {
          await fetchBalances(userAddress, provider)
        }, 3000)
        
      } catch (method2Error: any) {
        console.log('Method 2 failed, trying Method 3...', method2Error)
        
        // METHOD 3: Manual MetaMask transaction
        try {
          console.log('Method 3: Manual MetaMask transaction...')
          
          // Encode faucet function manually (function selector)
          const faucetSignature = 'faucet()'
          const iface = new Interface(abi)
          const functionSelector = iface.getFunction('faucet')!.selector
          console.log('Function selector:', functionSelector)
          
          // Get gas price
          const feeData = await provider.getFeeData()
          
          const txParams = {
            from: userAddress,
            to: contractAddress,
            data: functionSelector, // Just the function selector
            value: '0x0',
            gas: '0x1E8480', // 2,000,000 gas (high, but safe)
            maxFeePerGas: feeData.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
            chainId: 421614, // Arbitrum Sepolia chain ID
          }
          
          console.log('Sending transaction params:', txParams)
          
          // Send via MetaMask
          const txHash = await window.ethereum!.request({
            method: 'eth_sendTransaction',
            params: [txParams]
          }) as string
          
          setTxHash(txHash)
          console.log('✅ MetaMask transaction sent:', txHash)
          
          setSuccess(true)
          alert(`✅ ${amount} ${selectedToken} mint requested!\n\nTransaction: ${txHash}\n\nWaiting for confirmation...`)
          
          // Open arbiscan
          const arbiscanLink = `https://sepolia.arbiscan.io/tx/${txHash}`
          window.open(arbiscanLink, '_blank')
          
          // Poll for confirmation
          setTimeout(async () => {
            const receipt = await provider.getTransactionReceipt(txHash)
            if (receipt) {
              console.log('Transaction confirmed!')
              await fetchBalances(userAddress, provider)
            }
          }, 10000)
          
        } catch (method3Error: any) {
          console.log('All methods failed:', method3Error)
          
          // FALLBACK: Provide CLI command
          alert(`❌ All methods failed. Try this in your terminal:\n\ncast send ${contractAddress} "faucet()" \\\n  --private-key YOUR_PRIVATE_KEY \\\n  --rpc-url https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY \\\n  --legacy\n\nOr check contract on Arbiscan:\nhttps://sepolia.arbiscan.io/address/${contractAddress}#writeContract`)
          
          throw method3Error
        }
      }
    }
    
  } catch (error: any) {
    console.error('Minting failed:', error)
    setError(error.message)
    
    // User-friendly error messages
    if (error.code === 4001) {
      alert('❌ Transaction rejected by user')
    } else if (error.message.includes('insufficient funds')) {
      alert(`❌ Insufficient ETH for gas. You have ${ethBalance} ETH.\n\nGet ETH from:\nhttps://faucet.quicknode.com/arbitrum/sepolia`)
    } else if (error.message.includes('execution reverted')) {
      alert(`❌ Contract execution reverted.\n\nPossible reasons:\n1. Contract paused\n2. Daily limit reached\n3. Contract error\n\nTry manually: https://sepolia.arbiscan.io/address/${CONTRACT_ADDRESSES.UI_MOCK_USDC}#writeContract`)
    } else {
      alert(`❌ Failed to mint: ${error.message}`)
    }
  } finally {
    setMinting(false)
  }
}
  
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const getEthFromFaucet = () => {
    const faucetUrl = 'https://faucet.quicknode.com/arbitrum/sepolia'
    if (userAddress) {
      const text = `My wallet address: ${userAddress}\n\nPlease send 0.01 ETH to this address for gas fees.`
      alert(`Copy your address and go to:\n\n${faucetUrl}\n\n${text}`)
      copyToClipboard(userAddress)
    } else {
      alert(`Please connect your wallet first, then go to:\n\n${faucetUrl}`)
    }
  }
  
  
  return (
    <div className="space-y-4">
      <div className="glass-card p-4 rounded-xl border border-green-500/30">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold">UI Test Tokens (Easy Mint)</h3>
        </div>
        
        <div className="mb-4">
          {/* ETH Balance Warning */}
          {parseFloat(ethBalance) < 0.001 && (
            <div className="mb-4 p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Need ETH for Gas</span>
              </div>
              <div className="text-xs text-gray-400 mb-2">
                You need ETH for transaction fees. Current balance: {parseFloat(ethBalance).toFixed(6)} ETH
              </div>
              <button
                onClick={getEthFromFaucet}
                className="w-full py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-sm font-medium"
              >
                Get ETH from Faucet
              </button>
            </div>
          )}
          
          {/* Manual CLI Option */}          
          <p className="text-sm text-gray-300 mb-3">
            Mint test tokens directly from the contract.
          </p>
          
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">Error</span>
              </div>
              <div className="text-xs text-gray-400">{error}</div>
            </div>
          )}
          
          {/* Token Selection */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => setSelectedToken('USDC')}
              className={`p-3 rounded flex flex-col items-center transition-colors ${
                selectedToken === 'USDC' 
                  ? 'bg-blue-500/20 border border-blue-500' 
                  : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <DollarSign className="w-5 h-5 mb-1 text-blue-400" />
              <span className="text-sm font-medium">USDC</span>
              <span className="text-xs text-gray-400 mt-1">
                {parseFloat(tokenBalances.USDC).toLocaleString()} tokens
              </span>
            </button>
            
            <button
              onClick={() => setSelectedToken('ETH')}
              className={`p-3 rounded flex flex-col items-center transition-colors ${
                selectedToken === 'ETH' 
                  ? 'bg-purple-500/20 border border-purple-500' 
                  : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <Zap className="w-5 h-5 mb-1 text-purple-400" />
              <span className="text-sm font-medium">ETH</span>
              <span className="text-xs text-gray-400 mt-1">
                {parseFloat(tokenBalances.ETH).toLocaleString()} tokens
              </span>
            </button>
            
            <button
              onClick={() => setSelectedToken('BTC')}
              className={`p-3 rounded flex flex-col items-center transition-colors ${
                selectedToken === 'BTC' 
                  ? 'bg-yellow-500/20 border border-yellow-500' 
                  : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <Bitcoin className="w-5 h-5 mb-1 text-yellow-400" />
              <span className="text-sm font-medium">BTC</span>
              <span className="text-xs text-gray-400 mt-1">
                {parseFloat(tokenBalances.BTC).toLocaleString()} tokens
              </span>
            </button>
          </div>
          
          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/20">
              <div className="text-sm text-green-400 flex items-center gap-2 mb-2">
                <Check className="w-4 h-4" />
                <span>Tokens minted successfully!</span>
              </div>
              {txHash && (
                <div className="text-xs text-gray-400">
                  TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Mint Button */}
        <button
          onClick={handleMintTokens}
          disabled={minting || parseFloat(ethBalance) < 0.0001}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 disabled:opacity-50 font-bold flex items-center justify-center gap-2"
        >
          {minting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Minting...</span>
            </>
          ) : parseFloat(ethBalance) < 0.0001 ? (
            'Need ETH for Gas'
          ) : (
            <>
              <span>
                {selectedToken === 'USDC' ? 'Mint 10,000 USDC' : 
                 selectedToken === 'ETH' ? 'Mint 10 ETH' : 
                 'Mint 1 BTC'}
              </span>
            </>
          )}
        </button>
        
        {/* Info */}
        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <p className="flex items-center gap-1">
            <span className="text-green-400">✓</span> Contract verified working via CLI
          </p>
          <p className="flex items-center gap-1">
            <span className="text-green-400">✓</span> ETH balance: {parseFloat(ethBalance).toFixed(6)}
          </p>
          <p className="flex items-center gap-1">
            <span className="text-green-400">✓</span> Gas needed: ~36,000 units
          </p>
        </div>
      </div>
      
      {/* Transaction info */}
      {txHash && (
        <div className="glass-card p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Transaction</div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(txHash)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View
              </a>
            </div>
          </div>
          <div className="text-xs font-mono text-gray-400 break-all">
            {txHash}
          </div>
        </div>
      )}
      
      {/* Wallet info */}
      {userAddress && (
        <div className="glass-card p-3 rounded-lg">
          <div className="text-sm font-medium mb-2">Your Wallet</div>
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-gray-400 truncate max-w-[200px]">
              {userAddress}
            </div>
            <button
              onClick={() => copyToClipboard(userAddress)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            ETH: {parseFloat(ethBalance).toFixed(6)}
          </div>
        </div>
      )}
    </div>
  )
}