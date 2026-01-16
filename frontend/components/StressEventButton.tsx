// components/StressEventButton.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  AlertTriangle, Play, TrendingUp, TrendingDown, 
  Zap, Flame, CloudRain, Tornado, Loader2, 
  ExternalLink, RefreshCw, Coins, Activity,
  AlertCircle, Skull, Brain, CloudLightning,
  Rocket, Clock, Pause, PlayCircle, Terminal,
  BarChart3, Server
} from 'lucide-react'
import { Contract, BrowserProvider } from 'ethers'
import { CONTRACT_ADDRESSES, decodeCustomError } from '@/lib/contract-helpers'
import { COREWRITER_ORACLE_ABI } from '@/lib/abis'
import { useLivePriorityScore } from '@/lib/hooks/useLivePriorityScore'

// Pool IDs - must match swap-automation.js
const POOL_IDS = {
  BTC_USDC: '0x1dd8c051c7fc03e6d22c98be140f43f7443f7553826817cda2115ace5ae1b3aa',
  ETH_USDC: '0x3b7a8b2f53613e34d3c8df21673da84ab403788442e775f4103afa8018c99546'
}

interface AutomationStatus {
  running: boolean;
  lastEvent: any | null;
  eventsExecuted: number;
  nextEventIn: number;
}

interface Transaction {
  hash: string;
  type: string;
  event: string;
  timestamp: string;
  arbiscanLink: string;
}

export default function StressEventButton() {
  const [executing, setExecuting] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localPriorityScore, setLocalPriorityScore] = useState<number | null>(null)
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus>({
    running: false,
    lastEvent: null,
    eventsExecuted: 0,
    nextEventIn: 15
  })
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [showConsole, setShowConsole] = useState(false)
  const [consoleLogs, setConsoleLogs] = useState<string[]>([])
  const [isPolling, setIsPolling] = useState(false)
  
  // Use the live priority score hook
  const { priorityScore, loading: scoreLoading, error: scoreError, refresh } = useLivePriorityScore()

  // Update local state when priority score changes
  useEffect(() => {
    if (priorityScore !== null) {
      setLocalPriorityScore(priorityScore)
    }
  }, [priorityScore])

  // Poll for automation status
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch('/api/automation/status')
        if (response.ok) {
          const data = await response.json()
          setAutomationStatus(data)
          
          // Add recent transactions
          if (data.recentTransactions) {
            setRecentTransactions(data.recentTransactions.slice(0, 5))
          }
        }
      } catch (error) {
        console.error('Failed to fetch automation status:', error)
      }
    }
    
    if (isPolling) {
      pollStatus()
      const interval = setInterval(pollStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [isPolling])

  // Start polling when component mounts
  useEffect(() => {
    setIsPolling(true)
    return () => setIsPolling(false)
  }, [])

  // Event types matching swap-automation.js
  const stressEvents = [
    // JELLY-LIKE EVENTS (High stress, frequent)
    {
      id: 'jelly_adl_backup',
      name: 'JELLY ADL Queue Backup',
      description: 'Simulating ADL waste accumulation',
      isStress: true,
      icon: Tornado,
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      emoji: '🌀',
      asset: 'BTC',
      volume: 0.015, // BTC
      tickChange: -85,
      stressLevel: 70,
      jellyEvent: true
    },
    {
      id: 'jelly_kappa_60',
      name: 'JELLY κ_t=60% Waste Detected',
      description: 'Waste detection threshold reached',
      isStress: true,
      icon: AlertCircle,
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      emoji: '⚠️',
      asset: 'ETH',
      volume: 1.5, // ETH
      tickChange: -90,
      stressLevel: 75,
      jellyEvent: true
    },
    {
      id: 'liquidation_cascade',
      name: 'Mass Liquidation Cascade',
      description: 'Cascade of liquidations',
      isStress: true,
      icon: Skull,
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      emoji: '💥',
      asset: 'BTC',
      volume: 0.02,
      tickChange: -100,
      stressLevel: 85,
      jellyEvent: true
    },
    {
      id: 'market_panic',
      name: 'Market Panic Event',
      description: 'Extreme market stress',
      isStress: true,
      icon: CloudLightning,
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      emoji: '🚨',
      asset: 'BTC',
      volume: 0.03,
      tickChange: -120,
      stressLevel: 90,
      jellyEvent: true
    },
    {
      id: 'jelly_protocol_stress',
      name: 'JELLY Protocol Stress',
      description: 'Protocol-level stress event',
      isStress: true,
      icon: Brain,
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      emoji: '🪼',
      asset: 'ETH',
      volume: 2.0,
      tickChange: -150,
      stressLevel: 95,
      jellyEvent: true
    },
    
    // Regular stress events
    {
      id: 'market_stress',
      name: 'Market Stress',
      description: 'General market stress conditions',
      isStress: true,
      icon: AlertTriangle,
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      emoji: '🔴',
      asset: 'ETH',
      volume: 1.0,
      tickChange: -60,
      stressLevel: 50
    },
    {
      id: 'btc_price_drop',
      name: 'BTC Price Drop',
      description: 'BTC price drops significantly',
      isStress: true,
      icon: TrendingDown,
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      emoji: '📉',
      asset: 'BTC',
      volume: 0.01,
      tickChange: -50,
      stressLevel: 30
    },
    
    // Normal events
    {
      id: 'normal_eth_swap',
      name: 'Normal ETH Swap',
      description: 'Regular market activity',
      isStress: false,
      icon: CloudRain,
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      emoji: '🟢',
      asset: 'ETH',
      volume: 0.5,
      tickChange: 10,
      stressLevel: 0
    },
    {
      id: 'large_eth_swap',
      name: 'Large ETH Swap (>1 ETH)',
      description: 'High volume normal swap',
      isStress: false,
      icon: TrendingUp,
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      emoji: '🔵',
      asset: 'ETH',
      volume: 1.2,
      tickChange: 20,
      stressLevel: 10
    }
  ]

  const executeStressEvent = async (event: typeof stressEvents[0]) => {
    if (!window.ethereum) {
      alert('Please install MetaMask and connect wallet')
      return
    }

    setExecuting(event.id)
    setError(null)
    setTxHash(null)
    
    // Add to console logs
    addConsoleLog(`🚀 Executing event: ${event.name}`)
    
    try {
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const oracleContract = new Contract(
        CONTRACT_ADDRESSES.COREWRITER_ORACLE,
        COREWRITER_ORACLE_ABI,
        signer
      )

      // Get pool ID
      const poolId = event.asset === 'BTC' 
        ? POOL_IDS.BTC_USDC
        : POOL_IDS.ETH_USDC
      
      // Calculate volume with correct decimals
      const volume = event.asset === 'BTC'
        ? BigInt(Math.floor(event.volume * 1e8)) // BTC has 8 decimals
        : BigInt(Math.floor(event.volume * 1e18)) // ETH has 18 decimals
      
      console.log('Executing event:', {
        name: event.name,
        poolId,
        volume: volume.toString(),
        tickChange: event.tickChange,
        isStress: event.isStress
      })

      addConsoleLog(`📊 Event: ${event.name}`)
      addConsoleLog(`📈 Asset: ${event.asset}, Volume: ${event.volume}`)
      addConsoleLog(`🎯 Type: ${event.isStress ? 'Stress 🔴' : 'Normal 🟢'}`)

      // Execute the swap report
      const tx = await oracleContract.reportV4Swap(
        poolId,
        volume,
        event.tickChange,
        event.isStress,
        { gasLimit: 500000n } // Increased gas limit
      )
      
      setTxHash(tx.hash)
      addConsoleLog(`✅ Transaction sent: ${tx.hash}`)
      
      const receipt = await tx.wait()
      addConsoleLog(`📦 Transaction confirmed in block: ${receipt?.blockNumber}`)
      
      if (receipt?.status === 1) {
        // Update priority score
        const newScore = await oracleContract.priorityScore()
        setLocalPriorityScore(Number(newScore))
        
        // Add transaction to recent list
        const newTransaction: Transaction = {
          hash: tx.hash,
          type: event.isStress ? 'Stress Event' : 'Normal Event',
          event: event.name,
          timestamp: new Date().toISOString(),
          arbiscanLink: `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/tx/${tx.hash}`
        }
        
        setRecentTransactions(prev => [newTransaction, ...prev].slice(0, 10))
        
        // Show success
        alert(`✅ ${event.name} executed successfully!\n\n` +
              `Transaction: ${tx.hash}\n` +
              `New κ_t: ${Number(newScore)}/100\n` +
              `${event.isStress ? '🔴 Stress event: +15 κ_t' : '🟢 Normal event'}`)
      } else {
        throw new Error('Transaction failed')
      }
      
    } catch (error: any) {
      console.error('Stress event failed:', error)
      setError(error.message || 'Unknown error')
      
      // Add to console logs
      addConsoleLog(`❌ Error: ${error.message}`)
      
      // Try to decode custom error
      let errorMsg = error.message || 'Transaction failed'
      if (error.data) {
        const decoded = decodeCustomError(error.data)
        errorMsg = `Contract error: ${decoded}`
        addConsoleLog(`🔍 Decoded error: ${decoded}`)
      }
      
      alert(`❌ Failed: ${errorMsg}`)
    } finally {
      setExecuting(null)
    }
  }

  const toggleAutomation = async () => {
    try {
      const action = automationStatus.running ? 'stop' : 'start'
      
      const response = await fetch('/api/automation/swap', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test'}`
        },
        body: JSON.stringify({ 
          action,
          interval: 15 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAutomationStatus(prev => ({
          ...prev,
          running: !prev.running
        }))
        
        addConsoleLog(automationStatus.running ? '🛑 Automation stopped' : '🚀 Automation started')
      }
    } catch (error: any) {
      console.error('Failed to toggle automation:', error)
      alert(`Failed to toggle automation: ${error.message}`)
    }
  }

  const addConsoleLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setConsoleLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50))
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400'
    if (score > 75) return 'text-red-400'
    if (score > 25) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getNextEventTime = () => {
    if (!automationStatus.running) return 'Paused'
    return `${automationStatus.nextEventIn}s`
  }

  return (
    <div className="space-y-6">
      {/* AUTOMATION CONTROL PANEL */}
      <div className="glass-card p-6 rounded-xl border border-accent/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Live Automation Control</h2>
              <p className="text-sm text-gray-400">
                Run automated events from swap-automation.js
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Current Priority Score</div>
            <div className={`text-2xl font-bold ${getScoreColor(localPriorityScore)}`}>
              {scoreLoading ? 'Loading...' : 
               scoreError ? 'Error' : 
               localPriorityScore !== null ? `${localPriorityScore}/100` : '--/100'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Updates automatically from automation
            </div>
          </div>
        </div>

        {/* AUTOMATION STATUS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${automationStatus.running ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-sm font-medium">Automation Status</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {automationStatus.running ? 'RUNNING' : 'STOPPED'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {automationStatus.running ? 'Events every 15 seconds' : 'Click start to begin'}
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">Next Event In</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {getNextEventTime()}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {automationStatus.lastEvent ? `Last: ${automationStatus.lastEvent.name}` : 'No events yet'}
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium">Events Executed</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {automationStatus.eventsExecuted}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Total in current session
            </div>
          </div>
        </div>

        {/* CONTROL BUTTONS */}
        <div className="flex gap-3">
          <button
            onClick={toggleAutomation}
            className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-3 ${
              automationStatus.running 
                ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-90' 
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90'
            }`}
          >
            {automationStatus.running ? (
              <>
                <Pause className="w-5 h-5" />
                Stop Automation
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5" />
                Start Automation
              </>
            )}
          </button>
          
          <button
            onClick={refresh}
            className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          
          <button
            onClick={() => setShowConsole(!showConsole)}
            className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-medium flex items-center gap-2"
          >
            <Terminal className="w-4 h-4" />
            Console
          </button>
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      {recentTransactions.length > 0 && (
        <div className="glass-card p-4 rounded-xl">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Recent Transactions
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentTransactions.map((tx, index) => (
              <div key={index} className="p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{tx.event}</span>
                  <span className={`text-xs px-2 py-1 rounded ${tx.type.includes('Stress') ? 'bg-red-500/30 text-red-400' : 'bg-green-500/30 text-green-400'}`}>
                    {tx.type}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                  <a 
                    href={tx.arbiscanLink}
                    target="_blank"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </a>
                </div>
                <div className="text-xs text-gray-500 mt-1 break-all">
                  Hash: {tx.hash.substring(0, 20)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONSOLE OUTPUT */}
      {showConsole && (
        <div className="glass-card p-4 rounded-xl border border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Terminal className="w-4 h-4 text-green-400" />
              Automation Console
            </h3>
            <button
              onClick={() => setConsoleLogs([])}
              className="text-xs text-gray-400 hover:text-gray-300"
            >
              Clear
            </button>
          </div>
          <div className="bg-black rounded-lg p-3 font-mono text-sm text-gray-300 h-64 overflow-y-auto">
            {consoleLogs.length > 0 ? (
              consoleLogs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">
                Console output will appear here when automation runs...
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK MANUAL EVENTS */}
      <div className="glass-card p-4 rounded-xl">
        <h3 className="text-sm font-medium mb-3">Quick Manual Events</h3>
        <p className="text-sm text-gray-400 mb-4">
          Click to manually trigger events (automation must be stopped)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {stressEvents.slice(0, 4).map((event) => {
            const Icon = event.icon
            return (
              <button
                key={event.id}
                onClick={() => executeStressEvent(event)}
                disabled={executing === event.id || automationStatus.running}
                className={`p-3 rounded-lg flex flex-col items-center gap-2 ${
                  event.isStress 
                    ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 hover:from-red-500/30 hover:to-orange-500/30' 
                    : 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{event.name}</span>
                <span className="text-xs text-gray-400">{event.asset}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* TRANSACTION STATUS */}
      {(txHash || error) && (
        <div className="glass-card p-4 rounded-xl">
          <h3 className="text-sm font-medium mb-3">Transaction Status</h3>
          {txHash && (
            <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                ✅ Transaction Sent
              </div>
              <div className="text-xs text-gray-300 break-all">
                Hash: {txHash}
              </div>
              <a 
                href={`${CONTRACT_ADDRESSES.ARBISCAN_BASE}/tx/${txHash}`}
                target="_blank"
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View on Arbiscan
              </a>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                ❌ Error
              </div>
              <div className="text-xs text-gray-300">
                {error}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SCORE EXPLANATION */}
      <div className="glass-card p-4 rounded-xl bg-gradient-to-r from-gray-900 to-black">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          Understanding Priority Score (κ_t)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-green-500/10">
            <div className="font-medium text-green-400 mb-1">κ_t = 0-25 (CALM)</div>
            <div className="text-gray-300">
              • Maximum LTV available<br/>
              • Senior-focused allocation<br/>
              • Junior earns premium yield
            </div>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10">
            <div className="font-medium text-yellow-400 mb-1">κ_t = 26-75 (STRESS)</div>
            <div className="text-gray-300">
              • LTV ratios decreasing<br/>
              • Junior allocation increasing<br/>
              • Senior protection activating
            </div>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10">
            <div className="font-medium text-red-400 mb-1">κ_t = 76-100 (HIGH)</div>
            <div className="text-gray-300">
              • JELLY waste detection active<br/>
              • Junior absorbs all tail risk<br/>
              • Maximum senior protection<br/>
              • ADL queues backing up
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-3">
          Current: κ_t = {localPriorityScore !== null ? localPriorityScore : 'Loading...'} → 
          {localPriorityScore !== null && localPriorityScore >= 60 ? ' JELLY threshold active' : ' Normal operation'}
        </div>
      </div>
    </div>
  )
}