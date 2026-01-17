// lib/network-checker.ts 
import { BrowserProvider } from 'ethers'

export interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>
  on?: (event: string, handler: (...args: any[]) => void) => void
  removeListener?: (event: string, handler: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

export async function checkNetwork() {
  if (typeof window === 'undefined' || !window.ethereum) {
    return { valid: false, message: 'MetaMask not installed' }
  }
  
  try {
    // Use direct RPC call instead of ethers for better compatibility
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' })
    const chainId = parseInt(chainIdHex, 16)
    
    console.log('Current chain ID:', chainId)
    
    // Arbitrum Sepolia chain ID is 421614
    const ARBITRUM_SEPOLIA_ID = 421614
    
    if (chainId === ARBITRUM_SEPOLIA_ID) {
      // Get network details using ethers
      const provider = new BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()
      return { valid: true, chainId: network.chainId, name: network.name }
    } else {
      let networkName = 'Unknown'
      switch (chainId) {
        case 1: networkName = 'Ethereum Mainnet'; break
        case 11155111: networkName = 'Sepolia'; break
        case 42161: networkName = 'Arbitrum One'; break
        case 421614: networkName = 'Arbitrum Sepolia'; break
      }
      
      return { 
        valid: false, 
        chainId: BigInt(chainId),
        name: networkName,
        message: `Please switch to Arbitrum Sepolia (Chain ID: 421614). You're on ${networkName} (${chainId})`
      }
    }
  } catch (error) {
    console.error('Network check error:', error)
    return { valid: false, message: 'Failed to check network' }
  }
}

export async function switchToArbitrumSepolia() {
  if (!window.ethereum) {
    console.error('MetaMask not installed')
    return false
  }
  
  try {
    // First try to switch
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x66eee' }] // 421614 in hex
    })
    return true
  } catch (error: any) {
    console.log('Switch error:', error)
    
    // If chain not added (error code 4902), add it
    if (error.code === 4902 || error.code === -32603) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x66eee',
            chainName: 'Arbitrum Sepolia',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
            blockExplorerUrls: ['https://sepolia.arbiscan.io/']
          }]
        })
        return true
      } catch (addError) {
        console.error('Failed to add Arbitrum Sepolia:', addError)
        return false
      }
    }
    console.error('Failed to switch network:', error)
    return false
  }
}