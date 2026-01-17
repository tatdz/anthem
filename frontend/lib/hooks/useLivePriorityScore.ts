// hooks/useLivePriorityScore.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider, Contract } from 'ethers'
import { CONTRACT_ADDRESSES } from '@/lib/contract-helpers'
import { COREWRITER_ORACLE_ABI } from '@/lib/abis'

export const useLivePriorityScore = (refreshInterval = 10000) => {
  const [priorityScore, setPriorityScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPriorityScore = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        setError('No Ethereum provider')
        return
      }

      const provider = new BrowserProvider(window.ethereum)
      const oracleContract = new Contract(
        CONTRACT_ADDRESSES.COREWRITER_ORACLE,
        COREWRITER_ORACLE_ABI,
        provider
      )
      
      const score = await oracleContract.priorityScore()
      setPriorityScore(Number(score))
      setError(null)
      
    } catch (err: any) {
      console.error('Failed to fetch priority score:', err)
      setError(err.message || 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPriorityScore()

    // Set up polling for real-time updates
    const interval = setInterval(fetchPriorityScore, refreshInterval)
    
    return () => clearInterval(interval)
  }, [fetchPriorityScore, refreshInterval])

  return { 
    priorityScore, 
    loading, 
    error,
    refresh: fetchPriorityScore 
  }
}