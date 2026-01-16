// components/PriorityScoreDisplay.tsx
'use client'

import { useLivePriorityScore } from '@/lib/hooks/useLivePriorityScore'
import { Activity, TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react'

export function PriorityScoreDisplay() {
  const { priorityScore, loading, error, refresh } = useLivePriorityScore()

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400'
    if (score > 75) return 'text-red-400'
    if (score > 25) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getScoreDescription = (score: number | null) => {
    if (score === null) return 'Loading...'
    if (score > 75) return 'High Stress (JELLY events active)'
    if (score > 25) return 'Moderate Stress'
    return 'Calm Market'
  }

  const getTrendIcon = (score: number | null) => {
    if (score === null) return Activity
    if (score > 75) return TrendingUp
    if (score > 25) return TrendingUp
    return TrendingDown
  }

  const TrendIcon = getTrendIcon(priorityScore)

  return (
    <div className="glass-card p-4 rounded-xl border border-accent/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendIcon className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium">Priority Score (κ_t)</span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1 hover:bg-gray-800 rounded disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="mb-2">
        <div className={`text-3xl font-bold ${getScoreColor(priorityScore)}`}>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading...
            </div>
          ) : error ? (
            <span className="text-red-400 text-lg">Error</span>
          ) : priorityScore !== null ? (
            `${priorityScore}/100`
          ) : (
            '--/100'
          )}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {error ? error : getScoreDescription(priorityScore)}
        </div>
      </div>
      
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div 
          className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
          style={{ width: `${priorityScore || 0}%` }}
        />
      </div>
      
      <div className="grid grid-cols-3 gap-1 mt-3 text-xs">
        <div className="text-center">
          <div className="text-green-400">0-25</div>
          <div className="text-gray-500">Calm</div>
        </div>
        <div className="text-center">
          <div className="text-yellow-400">26-75</div>
          <div className="text-gray-500">Stress</div>
        </div>
        <div className="text-center">
          <div className="text-red-400">76-100</div>
          <div className="text-gray-500">High</div>
        </div>
      </div>
    </div>
  )
}