// app/api/oracle/score/route.ts
import { NextResponse } from 'next/server'
import { BrowserProvider, Contract } from 'ethers'
import { CONTRACT_ADDRESSES } from '@/lib/contract-helpers'
import { COREWRITER_ORACLE_ABI } from '@/lib/abis'

export async function GET() {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return NextResponse.json({ 
        score: 70, // Default for server-side
        timestamp: new Date().toISOString()
      })
    }

    // Check for ethereum provider
    if (!window.ethereum) {
      return NextResponse.json({ 
        score: 70,
        error: 'No Ethereum provider',
        timestamp: new Date().toISOString()
      })
    }

    const provider = new BrowserProvider(window.ethereum)
    const oracleContract = new Contract(
      CONTRACT_ADDRESSES.COREWRITER_ORACLE,
      COREWRITER_ORACLE_ABI,
      provider
    )
    
    const score = await oracleContract.priorityScore()
    
    return NextResponse.json({
      score: Number(score),
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Failed to fetch priority score:', error)
    
    // Return cached/default value
    return NextResponse.json({
      score: 70,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}