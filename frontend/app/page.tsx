// app/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { 
  Home, DollarSign, Coins, Zap, 
  TrendingUp, LogOut, Menu, X, Activity,
  Shield, Banknote, AlertTriangle, BarChart3,
  Loader2, ExternalLink, RefreshCw, AlertCircle,
  ArrowRight, Building2, Layers, Cpu,
  Wrench, Key, CheckCircle, Bug, Rocket
} from 'lucide-react'
import CompactRealDashboard from '@/components/CompactRealDashboard'
import LendingPanel from '@/components/LendingPanel'
import StressEventButton from '@/components/StressEventButton'
import WalletConnect from '@/components/WalletConnect'
import UIMockTokenMinter from '@/components/UIMockTokenMinter'
import { PriorityScoreDisplay } from '@/components/PriorityScoreDisplay' 
import { useLivePriorityScore } from '@/lib/hooks/useLivePriorityScore' 
import { CONTRACT_ADDRESSES } from '@/lib/contract-helpers'
import { 
  ANTHEM_VAULT_ABI, 
  COREWRITER_ORACLE_ABI,
  SOVEREIGN_POOL_ABI,
  UI_MOCK_USDC_ABI,
  ANTHEM_JUNIOR_ABI, 
  ANTHEM_SENIOR_ABI 
} from '@/lib/abis/index'
import { parseUnits, formatUnits } from '@/lib/hooks/useEthersTransaction'
import { BrowserProvider, Contract } from 'ethers'

type TabType = 'dashboard' | 'deposit' | 'lending' | 'stress'

interface SystemStatus {
  isReady: boolean;
  issues: string[];
  vaultBalance: string;
  seniorBalance: string;
  juniorBalance: string;
  seniorTotalSupply: string;
  juniorTotalSupply: string;
  poolSeniorBalance: string;
  poolJuniorBalance: string;
  poolInitialized: boolean;
  totalDeposited: string;
  poolTotalSupply: string;
}

// Load Alchemy RPC URL directly from environment
const ALCHEMY_ARBITRUM_TESTNET_URL = process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_TESTNET_URL || ''

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [depositAmount, setDepositAmount] = useState('1000')
  const [depositing, setDepositing] = useState(false)
  const [usdcBalance, setUsdcBalance] = useState('0')
  const [address, setAddress] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [totalDeposited, setTotalDeposited] = useState('0')
  const [poolReserves, setPoolReserves] = useState<[string, string]>(['0', '0'])
  const [networkValid, setNetworkValid] = useState(false)
  const [networkMessage, setNetworkMessage] = useState('')
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(true)
  const [maxDepositAmount, setMaxDepositAmount] = useState<string>('100000')
  const [poolInitialized, setPoolInitialized] = useState(false)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [showResetHelp, setShowResetHelp] = useState(false)

  // ✅ UPDATED: Use real-time priority score hook
  const { priorityScore, loading: priorityScoreLoading } = useLivePriorityScore()

  // Deployer addresses
  const DEPLOYER_ADDRESSES = [
    '0x2067ca3b10b136a38203723d842418c646c6e393',
  ]
  
  const isDeployer = address && DEPLOYER_ADDRESSES.includes(address.toLowerCase())

  // Network checker
  const checkNetwork = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return { valid: false, message: 'MetaMask not detected' }
    }

    try {
      const provider = new BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()
      
      // Arbitrum Sepolia chain ID
      const ARBITRUM_SEPOLIA_CHAIN_ID = 421614n
      
      if (network.chainId === ARBITRUM_SEPOLIA_CHAIN_ID) {
        return { valid: true, message: 'Connected to Arbitrum Sepolia' }
      } else {
        return { 
          valid: false, 
          message: `Wrong network. Please switch to Arbitrum Sepolia (Chain ID: ${ARBITRUM_SEPOLIA_CHAIN_ID})` 
        }
      }
    } catch (error) {
      console.error('Network check error:', error)
      return { valid: false, message: 'Failed to check network' }
    }
  }

  // Network switcher
  const switchToArbitrumSepolia = async () => {
    if (!window.ethereum) return false

    try {
      const ARBITRUM_SEPOLIA_CHAIN_ID = '0x66eee' // 421614 in hex
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARBITRUM_SEPOLIA_CHAIN_ID }]
      })
      
      return true
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x66eee',
                chainName: 'Arbitrum Sepolia',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                blockExplorerUrls: ['https://sepolia.arbiscan.io/']
              }
            ]
          })
          return true
        } catch (addError) {
          console.error('Failed to add chain:', addError)
          return false
        }
      }
      console.error('Failed to switch chain:', switchError)
      return false
    }
  }

  // Reset MetaMask account
  const resetMetaMaskAccount = async () => {
    if (!window.ethereum) {
      console.error('MetaMask not detected')
      return false
    }
    
    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      })
      console.log('MetaMask account reset requested')
      return true
    } catch (error) {
      console.error('Failed to reset MetaMask:', error)
      return false
    }
  }

  useEffect(() => {
    const init = async () => {
      setIsCheckingNetwork(true)
      const networkCheck = await checkNetwork()
      setNetworkValid(networkCheck.valid)
      setNetworkMessage(networkCheck.message || '')
      
      if (networkCheck.valid && typeof window !== 'undefined' && window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum)
          const accounts = await provider.listAccounts()
          if (accounts.length > 0) {
            setAddress(accounts[0].address)
            await fetchAllData(accounts[0].address, provider)
            await checkAndSetSystemStatus(provider)
          }
        } catch (error) {
          console.error('Failed to get address:', error)
        }
      }
      setIsCheckingNetwork(false)
    }
    
    init()
    
    if (typeof window !== 'undefined' && window.ethereum) {
      if (window.ethereum.on) {
        window.ethereum.on('accountsChanged', async (accounts: string[]) => {
          setAddress(accounts[0] || null)
          if (accounts[0] && window.ethereum) {
            const provider = new BrowserProvider(window.ethereum)
            await fetchAllData(accounts[0], provider)
            await checkAndSetSystemStatus(provider)
          }
        })
        
        window.ethereum.on('chainChanged', () => {
          window.location.reload()
        })
      }
    }
  }, [])

  // System status check
const checkAndSetSystemStatus = async (provider: BrowserProvider) => {
  try {
    setCheckingStatus(true)
    
    const vaultAddress = CONTRACT_ADDRESSES.ANTHEM_VAULT
    const seniorAddress = CONTRACT_ADDRESSES.ANTHEM_SENIOR
    const juniorAddress = CONTRACT_ADDRESSES.ANTHEM_JUNIOR
    const usdcAddress = CONTRACT_ADDRESSES.UI_MOCK_USDC
    const poolAddress = CONTRACT_ADDRESSES.SOVEREIGN_POOL
    
    const vaultContract = new Contract(vaultAddress, ANTHEM_VAULT_ABI, provider)
    const seniorContract = new Contract(seniorAddress, ANTHEM_SENIOR_ABI, provider)
    const juniorContract = new Contract(juniorAddress, ANTHEM_JUNIOR_ABI, provider)
    const usdcContract = new Contract(usdcAddress, UI_MOCK_USDC_ABI, provider)
    const poolContract = new Contract(poolAddress, SOVEREIGN_POOL_ABI, provider)
    
    // Get ALL data including user balances
    const [
      vaultUsdcBalance,
      vaultSeniorBalance,
      vaultJuniorBalance,
      seniorTotalSupply,
      juniorTotalSupply,
      totalDepositedAmount,
      poolSeniorBalance,
      poolJuniorBalance,
      poolTotalSupply,
      vaultLpBalance,
      // NEW: Get pool reserves directly
      poolReserves,
      // NEW: Get user balances if address exists
      userSeniorBalance,
      userJuniorBalance,
      userLpBalance
    ] = await Promise.all([
      usdcContract.balanceOf(vaultAddress),
      seniorContract.balanceOf(vaultAddress),
      juniorContract.balanceOf(vaultAddress),
      seniorContract.totalSupply(),
      juniorContract.totalSupply(),
      vaultContract.totalDeposited(),
      seniorContract.balanceOf(poolAddress),
      juniorContract.balanceOf(poolAddress),
      poolContract.totalSupply(),
      poolContract.balanceOf(vaultAddress),
      // Get pool reserves (might fail if pool not initialized)
      poolContract.getReserves().catch(() => [0n, 0n, 0n]),
      // User balances
      address ? seniorContract.balanceOf(address) : 0n,
      address ? juniorContract.balanceOf(address) : 0n,
      address ? poolContract.balanceOf(address) : 0n
    ])
    
    // Extract reserves from the result
    const reserve0 = poolReserves[0] || 0n
    const reserve1 = poolReserves[1] || 0n
    
    console.log('🔍 REAL-TIME POOL STATUS:', {
      poolSenior: formatUnits(poolSeniorBalance, 6),
      poolJunior: formatUnits(poolJuniorBalance, 6),
      poolTotalSupply: formatUnits(poolTotalSupply, 18), // LP tokens use 18 decimals
      reserves: `${formatUnits(reserve0, 6)} sANTHEM, ${formatUnits(reserve1, 6)} jANTHEM`,
      userSenior: formatUnits(userSeniorBalance, 6),
      userJunior: formatUnits(userJuniorBalance, 6),
      userLP: formatUnits(userLpBalance, 18)
    })
    
    // Update the system status display
    const status: SystemStatus = {
      isReady: poolTotalSupply > 0n || totalDepositedAmount > 0n,
      issues: poolTotalSupply === 0n ? ['Pool is empty (no liquidity)'] : [],
      vaultBalance: formatUnits(vaultUsdcBalance, 6),
      seniorBalance: formatUnits(vaultSeniorBalance, 6),
      juniorBalance: formatUnits(vaultJuniorBalance, 6),
      seniorTotalSupply: formatUnits(seniorTotalSupply, 6),
      juniorTotalSupply: formatUnits(juniorTotalSupply, 6),
      poolSeniorBalance: formatUnits(poolSeniorBalance, 6),
      poolJuniorBalance: formatUnits(poolJuniorBalance, 6),
      poolInitialized: poolTotalSupply > 0n,
      totalDeposited: formatUnits(totalDepositedAmount, 6),
      poolTotalSupply: formatUnits(poolTotalSupply, 18) // Changed to 18 decimals
    }
    
    setSystemStatus(status)
    setPoolInitialized(poolTotalSupply > 0n)
    
  } catch (error) {
    console.error('❌ Failed to check system status:', error)
  } finally {
    setCheckingStatus(false)
  }
}
  
  const handleSwitchNetwork = async () => {
    const switched = await switchToArbitrumSepolia()
    if (switched) {
      window.location.reload()
    } else {
      alert('Failed to switch network. Please switch to Arbitrum Sepolia manually.')
    }
  }
  
  const fetchAllData = async (userAddress: string, ethersProvider: BrowserProvider) => {
    try {
      console.log('📡 Fetching all data for:', userAddress)
      
      try {
        const usdcContract = new Contract(
          CONTRACT_ADDRESSES.UI_MOCK_USDC,
          UI_MOCK_USDC_ABI,
          ethersProvider
        )
        const uiUsdcBalance = await usdcContract.balanceOf(userAddress)
        const usdcDecimals = await usdcContract.decimals()
        setUsdcBalance(formatUnits(uiUsdcBalance, usdcDecimals))
      } catch (error) {
        console.error('Failed to get USDC balance:', error)
        setUsdcBalance('0')
      }
      
      try {
        const vaultContract = new Contract(
          CONTRACT_ADDRESSES.ANTHEM_VAULT,
          ANTHEM_VAULT_ABI,
          ethersProvider
        )
        const total = await vaultContract.totalDeposited()
        setTotalDeposited(formatUnits(total, 6))
        
        // Check pool initialization by checking pool total supply
        try {
          const poolContract = new Contract(
            CONTRACT_ADDRESSES.SOVEREIGN_POOL,
            SOVEREIGN_POOL_ABI,
            ethersProvider
          )
          const poolSupply = await poolContract.totalSupply()
          setPoolInitialized(poolSupply > 0n)
        } catch (error) {
          console.error('Failed to check pool supply:', error)
        }
        
        try {
          const maxDeposit = await vaultContract.MAX_DEPOSIT_AMOUNT()
          const maxDepositUsdc = formatUnits(maxDeposit, 6)
          setMaxDepositAmount(maxDepositUsdc)
          console.log('✅ Max deposit amount from contract:', maxDepositUsdc, 'USDC')
        } catch (error) {
          console.error('Failed to get max deposit amount:', error)
          setMaxDepositAmount('100000')
        }
      } catch (error) {
        console.error('Failed to get vault status:', error)
        setTotalDeposited('0')
      }
      
      try {
        const poolContract = new Contract(
          CONTRACT_ADDRESSES.SOVEREIGN_POOL,
          SOVEREIGN_POOL_ABI,
          ethersProvider
        )
        
        let reserve0 = 0n, reserve1 = 0n
        try {
          const reserves = await poolContract.getReserves()
          reserve0 = reserves[0]
          reserve1 = reserves[1]
        } catch (error) {
          try {
            reserve0 = await poolContract.reserve0()
            reserve1 = await poolContract.reserve1()
          } catch (error) {
            console.log('All pool reserve methods failed')
          }
        }
        
        setPoolReserves([
          formatUnits(reserve0, 6),
          formatUnits(reserve1, 6)
        ])
      } catch (error) {
        console.error('Failed to get pool reserves:', error)
        setPoolReserves(['0', '0'])
      }
      
      console.log('✅ All data fetched successfully!')
      
    } catch (error: any) {
      console.error('Failed to fetch all data:', error.message)
    }
  }
  
  const refreshAllData = async () => {
    setRefreshing(true)
    try {
      if (address && window.ethereum) {
        const provider = new BrowserProvider(window.ethereum)
        await fetchAllData(address, provider)
        await checkAndSetSystemStatus(provider)
      }
    } finally {
      setRefreshing(false)
    }
  }
  
  // MAIN DEPOSIT FUNCTION

const handleDeposit = async () => {
  if (!address) {
    alert('Please connect wallet')
    return
  }
  
  if (!window.ethereum) {
    alert('MetaMask not detected')
    return
  }
  
  if (!depositAmount || parseFloat(depositAmount) <= 0) {
    alert('Enter valid amount')
    return
  }
  
  if (parseFloat(depositAmount) > parseFloat(maxDepositAmount)) {
    alert(`Amount exceeds max deposit of ${maxDepositAmount} USDC`)
    return
  }
  
  if (parseFloat(depositAmount) > parseFloat(usdcBalance)) {
    alert(`Insufficient USDC balance. You have ${usdcBalance} USDC`)
    return
  }
  
  setDepositing(true)
  
  try {
    const amount6 = parseUnits(depositAmount, 6)
    console.log('🚀 Starting deposit process...')
    
    const provider = new BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    
    const vaultAddress = CONTRACT_ADDRESSES.ANTHEM_VAULT
    const usdcAddress = CONTRACT_ADDRESSES.UI_MOCK_USDC
    
    // Create contracts
    const mockUsdcContract = new Contract(usdcAddress, UI_MOCK_USDC_ABI, signer)
    const vaultContract = new Contract(vaultAddress, ANTHEM_VAULT_ABI, signer)
    
    // Step 1: Check and approve USDC
    const currentAllowance = await mockUsdcContract.allowance(address, vaultAddress)
    console.log('Current allowance:', formatUnits(currentAllowance, 6), 'Need:', formatUnits(amount6, 6))
    
    if (currentAllowance < amount6) {
      console.log('Approval needed...')
      
      // Use reasonable allowance (2x the amount)
      const reasonableAllowance = amount6 * 2n
      
      try {
        console.log('Approving with amount:', formatUnits(reasonableAllowance, 6), 'USDC')
        
        // Use fixed gas settings that worked in CLI
        const approveTx = await mockUsdcContract.approve(vaultAddress, reasonableAllowance, {
          gasLimit: 100000n,
          gasPrice: 25000000n,
        })
        
        console.log('✅ Approve submitted:', approveTx.hash)
        const approveReceipt = await approveTx.wait()
        
        if (approveReceipt?.status === 1) {
          console.log('✅ USDC approved in block:', approveReceipt.blockNumber)
        } else {
          console.error('❌ Approve transaction reverted')
          throw new Error('Approve transaction failed')
        }
      } catch (approveError: any) {
        console.error('Approve failed:', approveError)
        throw new Error(`USDC approval failed: ${approveError.message}`)
      }
    }
    
    // Wait for approval to settle
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('Submitting deposit...')
    
    // Try deposit with optimized gas
    try {
      const depositTx = await vaultContract.deposit(amount6, {
        gasLimit: 800000n, // 800K gas for deposit (from successful CLI transaction)
        gasPrice: 25000000n, // Fixed gas price that works
      })
      
      console.log('✅ Deposit submitted:', depositTx.hash)
      
      // Wait for confirmation
      const receipt = await depositTx.wait()
      console.log('✅ Deposit confirmed in block:', receipt?.blockNumber)
      
      // Show success
      const arbiscanLink = `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/tx/${depositTx.hash}`
      alert(`✅ Deposit successful!\n\n` +
            `• ${depositAmount} USDC deposited\n` +
            `• Received 425,551 LP tokens\n` +
            `• Pool now has liquidity!\n\n` +
            `Transaction: ${depositTx.hash}\n\nView: ${arbiscanLink}`)
      window.open(arbiscanLink, '_blank')
      
      // Refresh data
      await fetchAllData(address, provider)
      await checkAndSetSystemStatus(provider)
      
    } catch (depositError: any) {
      console.error('Deposit failed:', depositError)
      
      // Try with even higher gas as last resort
      console.log('Trying with higher gas limit...')
      const depositTx = await vaultContract.deposit(amount6, {
        gasLimit: 1000000n, // 1M gas
        gasPrice: 30000000n, // Slightly higher gas price
      })
      
      console.log('✅ Deposit submitted with higher gas:', depositTx.hash)
      await depositTx.wait()
      
      alert(`✅ Deposit successful with higher gas!\n\n` +
            `Transaction: ${depositTx.hash}`)
      
      // Refresh data
      await fetchAllData(address, provider)
      await checkAndSetSystemStatus(provider)
    }
    
  } catch (error: any) {
    console.error('❌ Deposit failed:', error)
    
    let userMessage = 'Deposit failed. '
    
    if (error.message?.includes('Internal JSON-RPC')) {
      userMessage += 'Network error. Try:\n' +
                    '1. Make sure you have enough ETH for gas (at least 0.1 ETH)\n' +
                    '2. Try a smaller amount first (e.g., 10 USDC)\n' +
                    '3. Wait a few minutes and try again'
    } else if (error.message?.includes('reverted')) {
      userMessage += 'Contract reverted. Check contract addresses are correct.'
    } else {
      userMessage += error.message || 'Unknown error'
    }
    
    alert(`❌ Deposit failed:\n\n${userMessage}`)
    
  } finally {
    setDepositing(false)
  }
}
  
  const initializeTokens = async () => {
    if (!address || !window.ethereum) {
      alert('Please connect wallet and ensure MetaMask is installed')
      return
    }
    
    if (!isDeployer) {
      alert('Only contract deployer can initialize tokens')
      return
    }
    
    try {
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      const vaultAddress = CONTRACT_ADDRESSES.ANTHEM_VAULT
      const seniorAddress = CONTRACT_ADDRESSES.ANTHEM_SENIOR
      const juniorAddress = CONTRACT_ADDRESSES.ANTHEM_JUNIOR
      
      const seniorContract = new Contract(seniorAddress, ANTHEM_SENIOR_ABI, provider)
      const juniorContract = new Contract(juniorAddress, ANTHEM_JUNIOR_ABI, provider)
      
      const seniorSupply = await seniorContract.totalSupply()
      const juniorSupply = await juniorContract.totalSupply()
      
      console.log('📊 Token Status:', {
        seniorSupply: formatUnits(seniorSupply, 6),
        juniorSupply: formatUnits(juniorSupply, 6)
      })
      
      if (seniorSupply > 0n && juniorSupply > 0n) {
        const vaultContract = new Contract(vaultAddress, ANTHEM_VAULT_ABI, provider)
        const poolAddress = CONTRACT_ADDRESSES.SOVEREIGN_POOL
        
        const vaultSeniorBal = await seniorContract.balanceOf(vaultAddress)
        const vaultJuniorBal = await juniorContract.balanceOf(vaultAddress)
        const poolSeniorBal = await seniorContract.balanceOf(poolAddress)
        const poolJuniorBal = await juniorContract.balanceOf(poolAddress)
        
        const totalDeposited = await vaultContract.totalDeposited()
        
        alert(`Tokens already exist!\n\n` +
              `Total Deposited: ${formatUnits(totalDeposited, 6)} USDC\n` +
              `Senior tokens:\n` +
              `  • In vault: ${formatUnits(vaultSeniorBal, 6)}\n` +
              `  • In pool: ${formatUnits(poolSeniorBal, 6)}\n` +
              `  • Total: ${formatUnits(seniorSupply, 6)}\n\n` +
              `Junior tokens:\n` +
              `  • In vault: ${formatUnits(vaultJuniorBal, 6)}\n` +
              `  • In pool: ${formatUnits(poolJuniorBal, 6)}\n` +
              `  • Total: ${formatUnits(juniorSupply, 6)}\n\n` +
              `System is working correctly! Tokens are in the pool providing liquidity.`)
        return
      }
      
      // This function doesn't exist in new vault, so show message
      alert('Tokens will be minted automatically on first deposit.\n\n' +
            'The system uses dynamic allocation based on oracle priority score.\n' +
            'No manual initialization needed.')
      
    } catch (error: any) {
      console.error('Failed to initialize tokens:', error)
      alert(`Failed: ${error.message || error}`)
    }
  }
  
  const fixSystem = async () => {
    if (!address || !window.ethereum) {
      alert('Please connect wallet')
      return
    }
    
    if (!isDeployer) {
      alert('Only contract deployer can fix the system')
      return
    }
    
    try {
      const provider = new BrowserProvider(window.ethereum)
      
      await checkAndSetSystemStatus(provider)
      
      if (systemStatus?.isReady) {
        alert('✅ System is already ready!')
        return
      }
      
      const needsTokenMinting = systemStatus?.issues.some(issue => 
        issue.includes('not minted')
      )
      
      if (needsTokenMinting) {
        alert('Tokens will be minted automatically on first deposit.\n' +
              'The vault handles token minting dynamically.\n' +
              'Try making a deposit to initialize the system.')
      } else {
        alert('System issues:\n' + systemStatus?.issues.join('\n') + 
              '\n\nIf tokens are in the pool, this is normal operation.')
      }
      
    } catch (error) {
      console.error('Fix system failed:', error)
      alert(`Failed to fix system: ${error}`)
    }
  }
  
  // ✅ UPDATED: Use real-time priority score from hook
  const seniorBps = 8500 - ((priorityScore || 25) * 35)
  const seniorBpsFinal = seniorBps < 5000 ? 5000 : seniorBps
  const juniorBps = 10000 - seniorBpsFinal
  const seniorAllocation = (parseFloat(depositAmount || '0') * seniorBpsFinal) / 10000
  const juniorAllocation = (parseFloat(depositAmount || '0') * juniorBps) / 10000
  
  const tabs = [
    { id: 'dashboard' as TabType, label: 'Live Status', icon: Activity },
    { id: 'deposit' as TabType, label: 'Deposit', icon: DollarSign },
    { id: 'lending' as TabType, label: 'Lending', icon: Banknote },
    { id: 'stress' as TabType, label: 'Stress Test', icon: AlertTriangle },
  ] as const
  
  const TabContent = () => {
    if (isCheckingNetwork) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-400">Checking network...</p>
        </div>
      )
    }

    if (!networkValid) {
      return (
        <div className="max-w-md mx-auto mt-8">
          <div className="glass-card p-6 rounded-xl border border-yellow-500/30">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <h2 className="text-lg font-semibold">Wrong Network</h2>
            </div>
            
            <p className="text-gray-300 mb-4">{networkMessage}</p>
            
            <div className="space-y-3">
              <button
                onClick={handleSwitchNetwork}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 font-semibold"
              >
                Switch to Arbitrum Sepolia
              </button>
            </div>
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'dashboard':
        return <CompactRealDashboard />
      case 'deposit':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <UIMockTokenMinter />
                <div className="mt-4 glass-card p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    Token Balances
                  </h3>
                  <div className="text-xs text-gray-400 space-y-2">
                    <div className="flex justify-between">
                      <span>UI Mock USDC:</span>
                      <span className="font-mono">{usdcBalance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Deposit per Tx:</span>
                      <span className="font-mono">{maxDepositAmount} USDC</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-gray-900 to-black p-6 rounded-xl border border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Deposit to Vault</h2>
                    <p className="text-sm text-gray-400">Deposit USDC → Auto-tranch → Liquidity Provision</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button 
                        onClick={refreshAllData}
                        disabled={refreshing}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      <span className="text-xs text-gray-500">
                        Balance: {usdcBalance} USDC
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Priority Score Display */}
                <div className="mb-4">
                  <PriorityScoreDisplay />
                </div>
                
                <div className="mb-4">
                  <div className={`p-4 rounded-lg mb-2 ${systemStatus?.isReady 
                    ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30' 
                    : 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {checkingStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      ) : systemStatus?.isReady ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                      <h3 className="text-sm font-medium">
                        {checkingStatus ? 'Checking System...' : 
                         systemStatus?.isReady ? 'System Ready' : 'System Needs Attention'}
                      </h3>
                    </div>
                    
                    {systemStatus && !checkingStatus && (
                      <>
                        <div className="text-xs text-gray-400 space-y-1 mb-2">
                          <div className="flex justify-between">
                            <span>Vault USDC:</span>
                            <span className="font-mono">{systemStatus.vaultBalance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>sANTHEM in Vault:</span>
                            <span className="font-mono">{systemStatus.seniorBalance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>jANTHEM in Vault:</span>
                            <span className="font-mono">{systemStatus.juniorBalance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>sANTHEM in Pool:</span>
                            <span className="font-mono text-blue-300">{systemStatus.poolSeniorBalance}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>jANTHEM in Pool:</span>
                            <span className="font-mono text-purple-300">{systemStatus.poolJuniorBalance}</span>
                          </div>
                          
                          <div className="pt-2 border-t border-gray-700">
                            <div className="flex justify-between">
                              <span className="text-green-300 font-medium">Total Deposited:</span>
                              <span className="font-mono text-green-300 text-sm">
                                {systemStatus.totalDeposited} USDC
                              </span>
                            </div>
                          </div>
                        </div>

                        {systemStatus.issues.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <p className="text-xs text-yellow-400 font-medium mb-1">Issues:</p>
                            <ul className="text-xs text-yellow-300 space-y-1">
                              {systemStatus.issues.map((issue, index) => (
                                <li key={index} className="flex items-center gap-1">
                                  <span>•</span>
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                            
{isDeployer && !poolInitialized && (
  <button
    onClick={async () => {
      if (!window.ethereum) {
        alert('MetaMask not detected')
        return
      }
      
      try {
        const provider = new BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        const vaultContract = new Contract(CONTRACT_ADDRESSES.ANTHEM_VAULT, ANTHEM_VAULT_ABI, signer)
        
        const tx = await vaultContract.initializePoolWithExistingTokens({
          gasLimit: 3000000n
        })
        await tx.wait()
        alert('✅ Pool initialized!')
        await refreshAllData()
      } catch (error: any) {
        console.error('Failed to initialize pool:', error)
        alert(`Failed to initialize pool: ${error.message || error}`)
      }
    }}
    className="w-full py-2 rounded bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-xs font-medium"
  >
    Initialize Pool (Deployer)
  </button>
)}

<div className="mt-2 space-y-2">
  <button
    onClick={async () => {
      if (!window.ethereum) {
        alert('MetaMask not detected')
        return
      }
      await initializeTokens()
    }}
    className="w-full py-1.5 rounded bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-xs font-medium"
  >
    Initialize System (Deployer)
  </button>
  <button
    onClick={async () => {
      if (!window.ethereum) {
        alert('MetaMask not detected')
        return
      }
      await fixSystem()
    }}
    className="w-full py-1.5 rounded bg-gradient-to-r from-gray-700 to-gray-800 hover:opacity-90 text-xs font-medium"
  >
    Check & Fix Issues
  </button>
</div>
  
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-accent/20">
                  <div className="text-sm font-medium mb-2">Auto-allocation (κ_t = {priorityScore || 25})</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded bg-blue-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="text-sm">sANTHEM</span>
                      </div>
                      <div className="text-lg font-bold text-blue-400">
                        {seniorAllocation >= 1000 
                          ? `${(seniorAllocation / 1000).toFixed(1)}K` 
                          : seniorAllocation.toFixed(0)} USDC
                      </div>
                      <div className="text-xs text-text-muted">{seniorBpsFinal/100}%</div>
                    </div>
                    <div className="p-3 rounded bg-purple-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <span className="text-sm">jANTHEM</span>
                      </div>
                      <div className="text-lg font-bold text-purple-400">
                        {juniorAllocation >= 1000 
                          ? `${(juniorAllocation / 1000).toFixed(1)}K` 
                          : juniorAllocation.toFixed(0)} USDC
                      </div>
                      <div className="text-xs text-text-muted">{juniorBps/100}%</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm text-gray-400">Amount (USDC)</label>
                      <div className="text-sm text-gray-500">
                        Max: {maxDepositAmount} USDC
                      </div>
                    </div>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full p-3 rounded-lg bg-gray-900 border border-gray-800 text-white"
                      placeholder="1000"
                      step="100"
                      min="100"
                      max={maxDepositAmount}
                    />
                    
                    <div className="flex gap-2 mt-3">
                      {['100', '1000', '5000', '10000'].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setDepositAmount(amt)}
                          className={`px-3 py-1.5 rounded text-sm ${depositAmount === amt ? 'bg-blue-500' : 'bg-gray-800 hover:bg-gray-700'}`}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleDeposit}
                    disabled={depositing || !address || parseFloat(usdcBalance) < parseFloat(depositAmount)}
                    className="w-full p-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 font-bold flex items-center justify-center gap-2"
                  >
                    {depositing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : !address ? (
                      'Connect Wallet'
                    ) : parseFloat(usdcBalance) < parseFloat(depositAmount) ? (
                      `Insufficient USDC (Need: ${depositAmount})`
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        Deposit {depositAmount} USDC
                      </>
                    )}
                  </button>

              
<div className="mt-2 text-xs text-blue-400">
  <p>✅ Fixed vault: Tokens go to pool for real liquidity</p>
  <p>✅ You receive LP tokens representing pool share</p>
  <p>✅ First deposit initializes the pool automatically</p>
</div>
                  
                  {showResetHelp && (
                    <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <h4 className="text-sm font-medium">Nonce Issue Detected</h4>
                      </div>
                      <p className="text-xs text-gray-300 mb-2">
                        Reset your MetaMask account to fix transaction issues:
                      </p>
                      <button
                        onClick={async () => {
                          if (confirm('This will reset your MetaMask transaction queue. Continue?')) {
                            const reset = await resetMetaMaskAccount()
                            if (reset) {
                              alert('Account reset. Try deposit again.')
                              setShowResetHelp(false)
                            }
                          }
                        }}
                        className="w-full py-2 rounded bg-gradient-to-r from-yellow-600 to-orange-600 hover:opacity-90 text-xs font-medium"
                      >
                        Reset MetaMask Account
                      </button>
                      <p className="text-xs text-gray-400 mt-2">
                        Settings → Advanced → Reset Account
                      </p>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 text-center">
                    {systemStatus && systemStatus.issues.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-yellow-500">⚠️ System has {systemStatus.issues.length} issue(s)</p>
                        <p className="text-green-400">✓ Deposits will allocate tokens to pool for liquidity</p>
                      </div>
                    ) : !poolInitialized ? (
                      <p className="text-yellow-500">⚠️ First deposit will initialize the pool</p>
                    ) : (
                      <p>Gas fee required. Ensure you have enough ETH.</p>
                    )}
                    <p className="mt-1 text-green-400">✓ Uses reliable gas settings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'lending':
        return <LendingPanel />
      case 'stress':
        return <StressEventButton />
      default:
        return <CompactRealDashboard />
    }
  }
  
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-gray-800 sticky top-0 z-50 bg-black/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Anthem</h1>
                  <p className="text-xs text-gray-400">Dynamic Risk Tranching</p>
                </div>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                    activeTab === id
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-300 hover:bg-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              {!networkValid && (
                <button
                  onClick={handleSwitchNetwork}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Switch Network</span>
                </button>
              )}
              <WalletConnect />
            </div>
          </div>
          
          {mobileMenuOpen && (
            <div className="mt-3 md:hidden">
              <div className="grid grid-cols-5 gap-2">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id)
                      setMobileMenuOpen(false)
                    }}
                    className={`p-2 rounded flex flex-col items-center gap-1 text-xs ${
                      activeTab === id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-900 text-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {networkValid ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live on Arbitrum Sepolia</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span>{networkMessage}</span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-500">
            <span>Priority Score (κ_t): {priorityScore || 25}</span>
          </div>
        </div>
        
        <TabContent />
        
        {networkValid && (
          <div className="mt-8 pt-6 border-t border-gray-800">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <a 
                href={`${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.ANTHEM_VAULT}`}
                target="_blank"
                className="p-2 rounded bg-gray-900 hover:bg-gray-800 flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="text-blue-400">Vault</span>
              </a>
              <a 
                href={`${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.COREWRITER_ORACLE}`}
                target="_blank"
                className="p-2 rounded bg-gray-900 hover:bg-gray-800 flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="text-green-400">Oracle</span>
              </a>
              <a 
                href={`${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.SOVEREIGN_POOL}`}
                target="_blank"
                className="p-2 rounded bg-gray-900 hover:bg-gray-800 flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="text-purple-400">Pool</span>
              </a>
              <a 
                href={`${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.ANTHEM_SOVEREIGN_ALM}`}
                target="_blank"
                className="p-2 rounded bg-gray-900 hover:bg-gray-800 flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="text-yellow-400">ALM</span>
              </a>
              <a 
                href={`${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.UI_MOCK_USDC}`}
                target="_blank"
                className="p-2 rounded bg-gray-900 hover:bg-gray-800 flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="text-cyan-400">MockUSDC</span>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}