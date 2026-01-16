// components/CompactRealDashboard.tsx 
'use client'
import { useState, useEffect } from 'react'
import { 
  Activity, Shield, Zap, DollarSign, BarChart3, 
  ExternalLink, RefreshCw, Clock, Loader2, Coins,
  TrendingUp, Percent, Info
} from 'lucide-react'
import { BrowserProvider, Contract, formatUnits } from 'ethers'
import { CONTRACT_ADDRESSES } from "@/lib/contract-helpers"
import { 
  COREWRITER_ORACLE_ABI, 
  SOVEREIGN_POOL_ABI, 
  ANTHEM_VAULT_ABI,
  ANTHEM_SENIOR_ABI,
  ANTHEM_JUNIOR_ABI,
  UI_MOCK_USDC_ABI
} from '@/lib/abis/index'
import { getTokenBalance } from '@/lib/utils'

// Ethereum provider type
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
}

export default function CompactRealDashboard() {
  const [address, setAddress] = useState<string | null>(null)
  const [blockNumber, setBlockNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [priorityScore, setPriorityScore] = useState<number>(25)
  const [totalDeposited, setTotalDeposited] = useState<string>('0')
  const [poolReserves, setPoolReserves] = useState<{senior: string, junior: string}>({senior: '0', junior: '0'})
  const [poolTVL, setPoolTVL] = useState<number>(0)
  const [poolTotalSupply, setPoolTotalSupply] = useState<string>('0')
  const [vaultLPTokens, setVaultLPTokens] = useState<string>('0')
  const [vaultSharePercentage, setVaultSharePercentage] = useState<number>(0)
  const [refreshing, setRefreshing] = useState(false)
  const [userTokenBalances, setUserTokenBalances] = useState({
    senior: '0',
    junior: '0',
    usdc: '0'
  })

  // Safe ethereum access
  const getEthereum = (): EthereumProvider => {
    if (typeof window === 'undefined') {
      throw new Error('window is undefined')
    }
    
    const ethereum = (window as any).ethereum as EthereumProvider | undefined
    if (!ethereum) {
      throw new Error('MetaMask not detected')
    }
    
    return ethereum
  }

  useEffect(() => {
    const init = async () => {
      try {
        const ethereum = getEthereum()
        const ethersProvider = new BrowserProvider(ethereum as any)
        
        // Get current block number
        const block = await ethersProvider.getBlockNumber()
        setBlockNumber(Number(block))
        
        // Get accounts
        const accounts = await ethersProvider.listAccounts()
        if (accounts.length > 0) {
          setAddress(accounts[0].address)
          await fetchAllData(accounts[0].address, ethersProvider)
        }
        
      } catch (error: any) {
        // Only log if it's not "MetaMask not detected"
        if (!error.message?.includes('MetaMask not detected')) {
          console.error('Failed to initialize:', error)
        }
      } finally {
        setLoading(false)
      }
    }
    
    init()
    
    // Listen for account changes
    try {
      const ethereum = getEthereum()
      if (ethereum.on) {
        const handleAccountsChanged = async (accounts: string[]) => {
          if (accounts[0]) {
            setAddress(accounts[0])
            try {
              const ethereum = getEthereum()
              const ethersProvider = new BrowserProvider(ethereum as any)
              await fetchAllData(accounts[0], ethersProvider)
            } catch (error) {
              console.error('Failed to update after account change:', error)
            }
          } else {
            setAddress(null)
          }
        }
        
        ethereum.on('accountsChanged', handleAccountsChanged)
        
        return () => {
          if (ethereum.removeListener) {
            ethereum.removeListener('accountsChanged', handleAccountsChanged)
          }
        }
      }
    } catch (error: any) {
      // Ignore if MetaMask not installed
      if (!error.message?.includes('MetaMask not detected')) {
        console.error('Failed to setup account listener:', error)
      }
    }
  }, [])

  const fetchAllData = async (userAddress: string, ethersProvider: BrowserProvider) => {
    try {
      console.log('📡 Dashboard fetching data...')
      
      // 1. Priority Score from Oracle
      try {
        const oracleContract = new Contract(
          CONTRACT_ADDRESSES.COREWRITER_ORACLE,
          COREWRITER_ORACLE_ABI,
          ethersProvider
        )
        
        const score = await oracleContract.priorityScore()
        setPriorityScore(Number(score))
      } catch (error) {
        console.error('Failed to get priority score:', error)
      }
      
      // 2. Vault Total Deposited
      try {
        const vaultContract = new Contract(
          CONTRACT_ADDRESSES.ANTHEM_VAULT,
          ANTHEM_VAULT_ABI,
          ethersProvider
        )
        
        const total = await vaultContract.totalDeposited()
        setTotalDeposited(formatUnits(total, 6))
      } catch (error) {
        console.error('Failed to get total deposited:', error)
      }
      
      // 3. Sovereign Pool Data
      try {
        const poolContract = new Contract(
          CONTRACT_ADDRESSES.SOVEREIGN_POOL,
          SOVEREIGN_POOL_ABI,
          ethersProvider
        )
        
        // Get pool state
        let seniorReserve = 0n, juniorReserve = 0n, totalLP = 0n
        
        try {
          const poolState = await poolContract.getPoolState()
          seniorReserve = poolState[0] // sANTHEM in pool
          juniorReserve = poolState[1] // jANTHEM in pool
          totalLP = poolState[2] // Total LP tokens
        } catch {
          // Fallback
          seniorReserve = await poolContract.reserve0()
          juniorReserve = await poolContract.reserve1()
          totalLP = await poolContract.totalSupply()
        }
        
        // Format with correct decimals (6 for tokens, 18 for LP)
        const seniorFormatted = formatUnits(seniorReserve, 6)
        const juniorFormatted = formatUnits(juniorReserve, 6)
        const totalLPFormatted = formatUnits(totalLP, 18)
        
        setPoolReserves({
          senior: seniorFormatted,
          junior: juniorFormatted
        })
        
        // Calculate pool TVL (sANTHEM + jANTHEM value in USDC terms)
        const seniorValue = parseFloat(seniorFormatted)
        const juniorValue = parseFloat(juniorFormatted)
        setPoolTVL(seniorValue + juniorValue)
        
        setPoolTotalSupply(totalLPFormatted)
        
        // Get vault's LP position
        try {
          const vaultLP = await poolContract.balanceOf(CONTRACT_ADDRESSES.ANTHEM_VAULT)
          const vaultLPFormatted = formatUnits(vaultLP, 18)
          setVaultLPTokens(vaultLPFormatted)
          
          // Calculate vault share percentage
          const vaultShare = totalLP > 0n 
            ? (Number(vaultLP) / Number(totalLP)) * 100 
            : 0
          setVaultSharePercentage(vaultShare)
        } catch (error) {
          console.error('Failed to get vault LP:', error)
        }
        
      } catch (error) {
        console.error('Failed to get pool data:', error)
      }
      
      // 4. User Token Balances
      try {
        // sANTHEM balance
        const seniorContract = new Contract(
          CONTRACT_ADDRESSES.ANTHEM_SENIOR,
          ANTHEM_SENIOR_ABI,
          ethersProvider
        )
        const seniorBal = await getTokenBalance(seniorContract, userAddress)
        
        // jANTHEM balance
        const juniorContract = new Contract(
          CONTRACT_ADDRESSES.ANTHEM_JUNIOR,
          ANTHEM_JUNIOR_ABI,
          ethersProvider
        )
        const juniorBal = await getTokenBalance(juniorContract, userAddress)
        
        // USDC balance (from UI Mock USDC)
        const usdcContract = new Contract(
          CONTRACT_ADDRESSES.UI_MOCK_USDC,
          UI_MOCK_USDC_ABI,
          ethersProvider
        )
        const usdcBal = await getTokenBalance(usdcContract, userAddress)
        
        setUserTokenBalances({
          senior: seniorBal.formatted,
          junior: juniorBal.formatted,
          usdc: usdcBal.formatted
        })
        
      } catch (error) {
        console.error('Failed to get user balances:', error)
      }
      
      console.log('✅ Dashboard data loaded successfully')
      
    } catch (error: any) {
      console.error('Dashboard fetch failed:', error.message)
    }
  }

  const refreshAll = async () => {
    setRefreshing(true)
    try {
      const ethereum = getEthereum()
      if (address) {
        const ethersProvider = new BrowserProvider(ethereum as any)
        await fetchAllData(address, ethersProvider)
      }
    } catch (error: any) {
      if (!error.message?.includes('MetaMask not detected')) {
        console.error('Failed to refresh data:', error)
      }
    } finally {
      setRefreshing(false)
    }
  }

  const connectWallet = async () => {
    try {
      const ethereum = getEthereum()
      const ethersProvider = new BrowserProvider(ethereum as any)
      const accounts = await ethersProvider.send('eth_requestAccounts', [])
      
      if (accounts.length > 0) {
        setAddress(accounts[0])
        await fetchAllData(accounts[0], ethersProvider)
      }
    } catch (error: any) {
      if (error.message?.includes('MetaMask not detected')) {
        alert('Please install MetaMask to connect your wallet')
      } else {
        console.error('Failed to connect wallet:', error)
        alert('Failed to connect wallet. Please try again.')
      }
    }
  }

  // Calculate derived values
  const vaultTVL = parseFloat(totalDeposited)
  const totalSystemTVL = vaultTVL + poolTVL
  
  // Dynamic allocation based on priority score
  const seniorAllocation = 85 - (priorityScore * 0.35)
  const juniorAllocation = 15 + (priorityScore * 0.35)
  
  // Format numbers nicely
  const formatCompactNumber = (num: number): string => {
    if (num === 0) return '0'
    if (num < 0.001) return '<0.001'
    if (num < 1) return num.toFixed(3)
    if (num < 1000) return num.toFixed(2)
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  // Format pool reserve numbers
  const seniorReserveNum = parseFloat(poolReserves.senior)
  const juniorReserveNum = parseFloat(poolReserves.junior)

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Live System Dashboard</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">Block:</span>
            <span className="font-mono">{blockNumber?.toLocaleString() || '--'}</span>
          </div>
          
          {address ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-gray-400">Connected</span>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-sm font-medium"
            >
              Connect Wallet
            </button>
          )}
          
          <button
            onClick={refreshAll}
            disabled={refreshing}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* MAIN METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Priority Score */}
        <div className="glass-card p-4 rounded-xl border border-accent/20">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium">Priority Score (κ_t)</span>
          </div>
          <div className="text-2xl font-bold mb-1">{priorityScore}/100</div>
          <div className="text-xs text-gray-400">
            Higher = More junior allocation
          </div>
        </div>
        
        {/* Total TVL */}
        <div className="glass-card p-4 rounded-xl border border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Total TVL</span>
          </div>
          <div className="text-2xl font-bold text-green-300 mb-1">
            ${formatCompactNumber(totalSystemTVL)}
          </div>
          <div className="text-xs text-gray-400">
            Vault + Pool combined
          </div>
        </div>
        
        {/* Senior Allocation */}
        <div className="glass-card p-4 rounded-xl border border-blue-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">Senior Allocation</span>
          </div>
          <div className="text-2xl font-bold text-blue-300 mb-1">
            {seniorAllocation.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400">
            Based on current κ_t
          </div>
        </div>
        
        {/* Junior Allocation */}
        <div className="glass-card p-4 rounded-xl border border-purple-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium">Junior Allocation</span>
          </div>
          <div className="text-2xl font-bold text-purple-300 mb-1">
            {juniorAllocation.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400">
            Based on current κ_t
          </div>
        </div>
      </div>
      
      {/* POOL & VAULT DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SOVEREIGN POOL STATUS */}
        <div className="glass-card p-4 rounded-xl border border-accent/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <h3 className="font-medium">Sovereign Pool</h3>
            </div>
            <a 
              href={`${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.SOVEREIGN_POOL}`}
              target="_blank"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              View
            </a>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Pool TVL</div>
              <div className="text-lg font-bold text-accent">${formatCompactNumber(poolTVL)}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded bg-blue-500/10">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-400">sANTHEM</span>
                </div>
                <div className="text-sm font-mono text-blue-300">
                  {seniorReserveNum.toFixed(2)}
                </div>
              </div>
              
              <div className="p-2 rounded bg-purple-500/10">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-xs text-gray-400">jANTHEM</span>
                </div>
                <div className="text-sm font-mono text-purple-300">
                  {juniorReserveNum.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="pt-3 border-t border-gray-800">
              <div className="text-xs text-gray-500 mb-1">Vault's Pool Position</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">LP Tokens:</span>
                <span className="font-mono">{parseFloat(vaultLPTokens).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Pool Share:</span>
                <span className="font-mono">{vaultSharePercentage.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* VAULT STATUS */}
        <div className="glass-card p-4 rounded-xl border border-accent/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              <h3 className="font-medium">Anthem Vault</h3>
            </div>
            <a 
              href={`${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.ANTHEM_VAULT}`}
              target="_blank"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              View
            </a>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Deposited</div>
              <div className="text-lg font-bold text-accent">${formatCompactNumber(vaultTVL)} USDC</div>
            </div>
            
            <div className="pt-3 border-t border-gray-800">
              <div className="text-xs text-gray-500 mb-2">Your Balances</div>
              
              {address ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">UI USDC:</span>
                    <span className="font-mono">{userTokenBalances.usdc}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">sANTHEM:</span>
                    <span className="font-mono text-blue-300">{userTokenBalances.senior}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">jANTHEM:</span>
                    <span className="font-mono text-purple-300">{userTokenBalances.junior}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400">Connect wallet to view balances</p>
                </div>
              )}
            </div>
            
            <div className="pt-3 border-t border-gray-800">
              <div className="text-xs text-gray-500 mb-1">Key Info</div>
              <p className="text-xs text-gray-400">
                Deposits auto-allocate to Sovereign Pool. Your share is tracked via LP tokens.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* DYNAMIC EXPLANATION FOOTER */}
      <div className="glass-card p-4 rounded-xl bg-gradient-to-r from-gray-900 to-black">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          Understanding the Numbers
        </h4>
        <div className="text-xs text-gray-400 space-y-2">
          <p>
            <strong>sANTHEM: {seniorReserveNum.toFixed(2)}</strong> = Senior tranche tokens in pool 
            (≈ {seniorReserveNum.toFixed(2)} USDC value)
          </p>
          <p>
            <strong>jANTHEM: {juniorReserveNum.toFixed(2)}</strong> = Junior tranche tokens in pool 
            (≈ {juniorReserveNum.toFixed(2)} USDC value)
          </p>
          <p>These represent your deposited USDC that's now providing liquidity in the Sovereign Pool.</p>
          <p className="text-cyan-300 mt-2">
          </p>
          <p className="text-xs text-gray-500 mt-3">
            <strong>Note:</strong> These numbers update dynamically based on deposits, withdrawals 
            and priority score (κ_t) changes.
          </p>
        </div>
      </div>
    </div>
  )
}