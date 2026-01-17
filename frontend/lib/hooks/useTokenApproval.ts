// lib/hooks/useTokenApproval.ts
import { useState } from 'react'
import { BrowserProvider, Contract } from 'ethers'
import { UI_MOCK_USDC_ABI } from '@/lib/abis/mock-tokens'

export function useTokenApproval() {
  const [approving, setApproving] = useState(false)

  const approveToken = async (
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint,
    userAddress: string
  ) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed')
    }

    setApproving(true)
    try {
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      const tokenContract = new Contract(
        tokenAddress,
        UI_MOCK_USDC_ABI,
        signer
      )

      // OPTION 1: Try direct call first
      try {
        console.log('Attempting direct approve...')
        const tx = await tokenContract.approve(spenderAddress, amount)
        console.log('✅ Approval submitted:', tx.hash)
        const receipt = await tx.wait()
        console.log('✅ Approval confirmed in block:', receipt?.blockNumber)
        return { success: true, hash: tx.hash }
      } catch (directError: any) {
        console.log('Direct approve failed, trying alternative...', directError)
        
        // OPTION 2: Try with manual transaction
        const data = tokenContract.interface.encodeFunctionData('approve', [
          spenderAddress,
          amount
        ])
        
        const txParams = {
          from: userAddress,
          to: tokenAddress,
          data: data,
          // Let MetaMask estimate gas
        }
        
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [txParams]
        }) as string
        
        console.log('✅ Approval submitted via raw:', txHash)
        return { success: true, hash: txHash }
      }
    } catch (error: any) {
      console.error('❌ All approval attempts failed:', error)
      
      // Provide specific error messages
      if (error.code === 4001) {
        throw new Error('Transaction rejected by user')
      } else if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient ETH for gas fees')
      } else if (error.message.includes('Internal JSON-RPC error')) {
        // Check if contract is actually deployed
        const provider = new BrowserProvider(window.ethereum)
        const code = await provider.getCode(tokenAddress)
        if (!code || code === '0x' || code === '0x0') {
          throw new Error('Token contract not deployed at this address')
        }
        throw new Error('Contract call failed. The token contract might have restrictions.')
      }
      throw error
    } finally {
      setApproving(false)
    }
  }

  const approveMax = async (
    tokenAddress: string,
    spenderAddress: string,
    userAddress: string
  ) => {
    const maxAmount = 2n ** 256n - 1n
    return await approveToken(tokenAddress, spenderAddress, maxAmount, userAddress)
  }

  return { approveToken, approveMax, approving }
}