// lib/hooks/useEthersTransaction.ts 
'use client'
import { useState } from 'react'
import { BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers'
import { logger } from '@/lib/contract-helpers'

export const useEthersTransaction = () => {
  const [isSending, setIsSending] = useState(false)
  
  const sendTransaction = async (config: any) => {
    if (!(window as any).ethereum) {
      throw new Error('MetaMask not installed')
    }
    
    setIsSending(true)
    
    try {
      // Connect to MetaMask directly
      const provider = new BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      
      console.log('🚀 Sending REAL transaction with ethers.js:', {
        contract: config.address,
        function: config.functionName,
        args: config.args?.map((arg: any) => 
          typeof arg === 'bigint' ? arg.toString() : arg
        ),
      })
      
      // Create contract instance
      const contract = new Contract(
        config.address,
        config.abi,
        signer
      )
      
      // Send transaction with gas estimation
      const gasLimit = config.gas || 300000n
      
      console.log('⛽ Gas limit:', gasLimit.toString())
      
      const tx = await contract[config.functionName](...(config.args || []), {
        gasLimit,
      })
      
      console.log('✅ Transaction sent! Hash:', tx.hash)
      
      logger.info('✅ Transaction submitted', { 
        txHash: tx.hash,
        contract: config.address,
        function: config.functionName 
      })
      
      // Store in localStorage immediately
      if (typeof window !== 'undefined') {
        const txs = JSON.parse(localStorage.getItem('real_transactions') || '[]')
        txs.unshift({
          hash: tx.hash,
          action: config.functionName,
          contract: config.address,
          link: `https://sepolia.arbiscan.io/tx/${tx.hash}`,
          timestamp: new Date().toISOString(),
          status: 'pending',
          details: config.args?.map((arg: any) => 
            typeof arg === 'bigint' ? arg.toString() : String(arg)
          )
        })
        localStorage.setItem('real_transactions', JSON.stringify(txs.slice(0, 20)))
      }
      
      // Wait for confirmation
      console.log('⏳ Waiting for confirmation...')
      const receipt = await tx.wait()
      
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber)
      
      logger.success('✅ Transaction confirmed!', {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      })
      
      // Update transaction status
      if (typeof window !== 'undefined') {
        const txs = JSON.parse(localStorage.getItem('real_transactions') || '[]')
        const txIndex = txs.findIndex((t: any) => t.hash === tx.hash)
        if (txIndex !== -1) {
          txs[txIndex].status = 'success'
          txs[txIndex].blockNumber = Number(receipt.blockNumber)
          localStorage.setItem('real_transactions', JSON.stringify(txs))
        }
      }
      
      return tx.hash
      
    } catch (error: any) {
      console.error('❌ Transaction failed:', error)
      logger.error('Transaction failed', error)
      
      // Update to error status
      if (typeof window !== 'undefined') {
        const txs = JSON.parse(localStorage.getItem('real_transactions') || '[]')
        const txIndex = txs.findIndex((t: any) => t.hash === (error.transactionHash || error.hash))
        if (txIndex !== -1) {
          txs[txIndex].status = 'error'
          txs[txIndex].error = error.message
          localStorage.setItem('real_transactions', JSON.stringify(txs))
        }
      }
      
      throw error
      
    } finally {
      setIsSending(false)
    }
  }
  
  return {
    sendTransaction,
    isSending,
  }
}

// Re-export ethers utilities for convenience
export { parseUnits, formatUnits }