// components/TransactionMonitor.tsx
'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, ExternalLink, RefreshCw, Trash2 } from 'lucide-react'

interface Transaction {
  hash: string
  action: string
  contract: string
  link: string
  timestamp: string
  status: 'pending' | 'success' | 'error'
  blockNumber?: number
  details?: any
}

export default function TransactionMonitor() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  
  useEffect(() => {
    loadTransactions()
    
    // Listen for storage changes
    const handleStorageChange = () => {
      loadTransactions()
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
  
  const loadTransactions = () => {
    if (typeof window !== 'undefined') {
      const txs = JSON.parse(localStorage.getItem('real_transactions') || '[]')
      setTransactions(txs)
    }
  }
  
  const clearTransactions = () => {
    if (typeof window !== 'undefined') {
      if (confirm('Clear all transaction history?')) {
        localStorage.removeItem('real_transactions')
        setTransactions([])
      }
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />
      default: return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-500/30 bg-green-500/10'
      case 'error': return 'border-red-500/30 bg-red-500/10'
      default: return 'border-yellow-500/30 bg-yellow-500/10'
    }
  }
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  if (transactions.length === 0) {
    return (
      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Recent Transactions</h3>
          <button
            onClick={loadTransactions}
            className="p-1 rounded bg-gray-800 hover:bg-gray-700"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">No transactions yet</div>
          <div className="text-xs text-gray-600">
            Perform an action (deposit, add liquidity, create loan) to see real on-chain transactions
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Recent Transactions</h3>
        <div className="flex gap-2">
          <button
            onClick={loadTransactions}
            className="p-1.5 rounded bg-gray-800 hover:bg-gray-700"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={clearTransactions}
            className="p-1.5 rounded bg-gray-800 hover:bg-gray-700"
            title="Clear all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {transactions.map((tx, i) => (
          <div 
            key={i} 
            className={`p-3 rounded border ${getStatusColor(tx.status)}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(tx.status)}
                <div>
                  <div className="text-sm font-medium">{tx.action}</div>
                  <div className="text-xs text-gray-400">
                    {formatTime(tx.timestamp)}
                  </div>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                tx.status === 'success' ? 'bg-green-500/20 text-green-400' :
                tx.status === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {tx.status}
              </span>
            </div>
            
            {tx.details && (
              <div className="text-xs text-gray-500 mb-2">
                {Object.entries(tx.details).map(([key, value]) => (
                  <div key={key} className="truncate">
                    {key}: {String(value)}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-gray-400 truncate max-w-[140px]">
                {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
              </div>
              <div className="flex items-center gap-2">
                {tx.blockNumber && (
                  <span className="text-xs text-gray-500">
                    Block #{tx.blockNumber}
                  </span>
                )}
                <a
                  href={tx.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-800 text-center">
        <div className="text-xs text-gray-500">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} • Updates automatically
        </div>
      </div>
    </div>
  )
}