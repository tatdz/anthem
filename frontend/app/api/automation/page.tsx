// app/automation/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, Play, Pause, RefreshCw, ExternalLink, 
  TrendingUp, TrendingDown, Zap, AlertTriangle, 
  Clock, BarChart3, Server, Terminal, Loader2
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AutomationStatus {
  running: boolean;
  lastEvent: any;
  eventsExecuted: number;
  nextEventIn: number;
  recentTransactions: any[];
}

interface Transaction {
  hash: string;
  type: string;
  event: string;
  timestamp: string;
  arbiscanLink: string;
}

export default function AutomationDashboard() {
  const router = useRouter()
  const [status, setStatus] = useState<AutomationStatus>({
    running: false,
    lastEvent: null,
    eventsExecuted: 0,
    nextEventIn: 15,
    recentTransactions: []
  })
  const [loading, setLoading] = useState(true)
  const [consoleLogs, setConsoleLogs] = useState<string[]>([])
  const [priorityScore, setPriorityScore] = useState<number | null>(null)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/automation/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch automation status:', error)
    }
  }

  const fetchPriorityScore = async () => {
    try {
      const response = await fetch('/api/oracle/score')
      if (response.ok) {
        const data = await response.json()
        setPriorityScore(data.score)
      }
    } catch (error) {
      console.error('Failed to fetch priority score:', error)
    }
  }

  const toggleAutomation = async () => {
    try {
      const action = status.running ? 'stop' : 'start'
      const response = await fetch('/api/automation/swap', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test'}`
        },
        body: JSON.stringify({ action, interval: 15 })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStatus(prev => ({ ...prev, running: !prev.running }))
          addConsoleLog(`Automation ${action === 'stop' ? 'stopped' : 'started'}`)
        }
      }
    } catch (error) {
      console.error('Failed to toggle automation:', error)
    }
  }

  const executeSingleEvent = async () => {
    try {
      addConsoleLog('Executing single event...')
      const response = await fetch('/api/automation/swap', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test'}`
        },
        body: JSON.stringify({ action: 'single-event' })
      })
      
      if (response.ok) {
        const data = await response.json()
        addConsoleLog(`Single event executed: ${data.result?.event?.name}`)
        await fetchStatus()
        await fetchPriorityScore()
      }
    } catch (error) {
      console.error('Failed to execute single event:', error)
    }
  }

  const addConsoleLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setConsoleLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20))
  }

  useEffect(() => {
    fetchStatus()
    fetchPriorityScore()
    
    const interval = setInterval(() => {
      fetchStatus()
      fetchPriorityScore()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Simulate console logs based on status changes
    if (status.lastEvent) {
      addConsoleLog(`Event executed: ${status.lastEvent.name}`)
    }
  }, [status.lastEvent])

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400'
    if (score > 75) return 'text-red-400'
    if (score > 25) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getScoreLevel = (score: number | null) => {
    if (score === null) return 'Loading...'
    if (score > 75) return 'High Stress 🔴'
    if (score > 25) return 'Moderate Stress 🟡'
    return 'Calm 🟢'
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Anthem Automation Dashboard</h1>
              <p className="text-sm text-gray-400">Real-time automation control and monitoring</p>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
          >
            Back to Main
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${status.running ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-sm font-medium">Status</span>
            </div>
            <div className="text-2xl font-bold mb-1">
              {status.running ? 'RUNNING' : 'STOPPED'}
            </div>
            <div className="text-xs text-gray-400">
              {status.running ? `Next event in ${status.nextEventIn}s` : 'Ready to start'}
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Priority Score</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(priorityScore)}`}>
              {priorityScore !== null ? `${priorityScore}/100` : '--'}
            </div>
            <div className="text-xs text-gray-400">
              {getScoreLevel(priorityScore)}
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">Events Executed</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {status.eventsExecuted}
            </div>
            <div className="text-xs text-gray-400">
              Total in session
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium">Transactions</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400">
              {status.recentTransactions?.length || 0}
            </div>
            <div className="text-xs text-gray-400">
              Recent transactions
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="glass-card p-6 rounded-xl mb-8">
          <h2 className="text-lg font-semibold mb-4">Automation Control</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={toggleAutomation}
              className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-3 ${
                status.running 
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-90' 
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90'
              }`}
            >
              {status.running ? (
                <>
                  <Pause className="w-5 h-5" />
                  Stop Automation
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Automation
                </>
              )}
            </button>
            
            <button
              onClick={executeSingleEvent}
              disabled={status.running}
              className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 font-bold flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Zap className="w-5 h-5" />
              Execute Single Event
            </button>
            
            <button
              onClick={() => {
                fetchStatus()
                fetchPriorityScore()
              }}
              className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Recent Events & Console */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Recent Transactions
            </h2>
            
            {status.recentTransactions?.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {status.recentTransactions.map((tx, index) => (
                  <div key={index} className="p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">{tx.event}</span>
                      <span className={`text-xs px-2 py-1 rounded ${tx.type.includes('Stress') ? 'bg-red-500/30 text-red-400' : 'bg-green-500/30 text-green-400'}`}>
                        {tx.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
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
                    <div className="text-xs text-gray-500 break-all">
                      Hash: {tx.hash.substring(0, 20)}...
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No transactions yet. Start automation to see events here.
              </div>
            )}
          </div>

          {/* Console Output */}
          <div className="glass-card p-6 rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Terminal className="w-5 h-5 text-green-400" />
                Console Output
              </h2>
              <button
                onClick={() => setConsoleLogs([])}
                className="text-sm text-gray-400 hover:text-gray-300"
              >
                Clear
              </button>
            </div>
            
            <div className="bg-black rounded-lg p-4 font-mono text-sm text-gray-300 h-96 overflow-y-auto">
              {consoleLogs.length > 0 ? (
                consoleLogs.map((log, index) => (
                  <div key={index} className="mb-1 border-l-2 border-gray-700 pl-2">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic h-full flex items-center justify-center">
                  Console output will appear here when automation runs...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Last Event Details */}
        {status.lastEvent && (
          <div className="glass-card p-6 rounded-xl mt-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Last Event Details
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-gray-800/50">
                <div className="text-xs text-gray-500 mb-1">Event Name</div>
                <div className="font-medium">{status.lastEvent.name}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-800/50">
                <div className="text-xs text-gray-500 mb-1">Asset</div>
                <div className="font-medium">{status.lastEvent.asset}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-800/50">
                <div className="text-xs text-gray-500 mb-1">Type</div>
                <div className={`font-medium ${status.lastEvent.isStress ? 'text-red-400' : 'text-green-400'}`}>
                  {status.lastEvent.isStress ? 'Stress Event' : 'Normal Event'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gray-800/50">
                <div className="text-xs text-gray-500 mb-1">Time</div>
                <div className="font-medium">
                  {new Date(status.lastEvent.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Automation Info */}
        <div className="glass-card p-6 rounded-xl mt-8 bg-gradient-to-r from-gray-900 to-black">
          <h2 className="text-lg font-semibold mb-4">How Automation Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-2 text-cyan-400">Event Types</h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Normal Events: Small volume, no score change</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span>Stress Events: +15 to κ_t</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span>JELLY Events: Every 3rd event, simulates ADL waste</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2 text-cyan-400">Impact on System</h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• Higher κ_t → More junior allocation</li>
                <li>• Higher κ_t → Lower LTV ratios</li>
                <li>• κ_t ≥ 60%: JELLY waste detection active</li>
                <li>• κ_t ≥ 75%: Maximum junior protection</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}