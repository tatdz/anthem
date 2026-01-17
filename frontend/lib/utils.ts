// lib/utils.ts 
import { formatUnits, Contract } from 'ethers'
import { CONTRACT_ADDRESSES } from './contract-helpers'



export async function getTokenBalance(
  contract: any,
  address: string
): Promise<{ balance: bigint; formatted: string }> {
  try {
    // Check if contract is valid
    if (!contract || typeof contract.balanceOf !== 'function') {
      console.warn('Invalid contract instance for getTokenBalance')
      return { balance: 0n, formatted: '0' }
    }
    
    // Try direct call first
    const balance = await contract.balanceOf(address)
    
    // If balance is 0x or empty, it means the call failed
    if (balance === undefined || balance === null) {
      console.warn('Contract call returned undefined/null')
      return { balance: 0n, formatted: '0' }
    }
    
    // Get contract address to determine decimals
    let contractAddress = ''
    try {
      contractAddress = await contract.getAddress()
    } catch {
      try {
        contractAddress = contract.address
      } catch {
        console.warn('Could not get contract address')
      }
    }
    
    // Determine decimals
    let decimals: number = 18 // Default to 18
    
    try {
      // First try to get decimals from contract
      if (typeof contract.decimals === 'function') {
        decimals = Number(await contract.decimals())
        console.log(`Got decimals from contract: ${decimals} for ${contractAddress}`)
      } else {
        // Fallback to known decimals
        decimals = getDefaultDecimals(contractAddress)
      }
    } catch (error) {
      console.warn('Failed to get decimals from contract, using default:', error)
      decimals = getDefaultDecimals(contractAddress)
    }
    
    const formatted = formatUnits(balance, decimals)
    console.log(`Token balance: ${formatted} (decimals: ${decimals}, raw: ${balance})`)
    
    return { balance: BigInt(balance.toString()), formatted }
  } catch (error) {
    console.error('Error getting token balance:', error)
    // Return default values
    return { balance: 0n, formatted: '0' }
  }
}

export async function rawCall(
  provider: any,
  contractAddress: string,
  data: string
): Promise<string> {
  try {
    return await provider.call({
      to: contractAddress,
      data
    })
  } catch (error) {
    console.error('Raw call failed:', error)
    return '0x'
  }
}

// Add the missing fallback functions
export const getPriorityScoreFallback = (): number => 25
export const getTotalDepositedFallback = (): string => '0'
export const getPoolReservesFallback = (): [string, string] => ['0', '0']

export function getDefaultDecimals(contractAddress: string): number {
  if (!contractAddress) return 18
  
  const lowerAddr = contractAddress.toLowerCase()
  
  // Known contract addresses and their decimals - UPDATED WITH ALL TOKENS
  const knownDecimals: Record<string, number> = {
    // UI Mock tokens (with faucet)
    [CONTRACT_ADDRESSES.UI_MOCK_USDC.toLowerCase()]: 6,  // uiUSDC has 6 decimals
    [CONTRACT_ADDRESSES.UI_MOCK_ETH.toLowerCase()]: 18,  // uiETH has 18 decimals
    [CONTRACT_ADDRESSES.UI_MOCK_BTC.toLowerCase()]: 8,   // uiBTC has 8 decimals
    
    // Mock tokens (original deployment)
    [CONTRACT_ADDRESSES.MOCK_USDC.toLowerCase()]: 6,
    [CONTRACT_ADDRESSES.MOCK_ETH.toLowerCase()]: 18,
    [CONTRACT_ADDRESSES.MOCK_BTC.toLowerCase()]: 8,
    
    // Anthem tokens (sANTHEM and jANTHEM use 6 decimals to match USDC)
    [CONTRACT_ADDRESSES.ANTHEM_SENIOR.toLowerCase()]: 6,    // sANTHEM uses 6 decimals
    [CONTRACT_ADDRESSES.ANTHEM_JUNIOR.toLowerCase()]: 6,    // jANTHEM uses 6 decimals
    
    // Sovereign Pool LP tokens (use 18 decimals - standard for LP tokens)
    [CONTRACT_ADDRESSES.SOVEREIGN_POOL.toLowerCase()]: 18,   // ANTHEM-LP uses 18 decimals
    
    // Core contracts (not tokens)
    [CONTRACT_ADDRESSES.ANTHEM_VAULT.toLowerCase()]: 6,      // Vault deals with USDC (6 decimals)
    [CONTRACT_ADDRESSES.COREWRITER_ORACLE.toLowerCase()]: 18,
    [CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE.toLowerCase()]: 6,
    [CONTRACT_ADDRESSES.ANTHEM_SOVEREIGN_ALM.toLowerCase()]: 18,
    [CONTRACT_ADDRESSES.V4_SWAP_EXECUTOR.toLowerCase()]: 18,
  }
  
  const result = knownDecimals[lowerAddr]
  console.log(`getDefaultDecimals for ${lowerAddr}: ${result || 18} (fallback: ${result ? 'found' : 'using default 18'})`)
  
  return result || 18
}

// Check if contract is deployed
export async function isContractDeployed(
  provider: any,
  address: string
): Promise<boolean> {
  try {
    const code = await provider.getCode(address)
    return code && code !== '0x' && code !== '0x0'
  } catch {
    return false
  }
}

// Helper to format values with correct decimals
export function formatWithDecimals(value: bigint | string, contractAddress: string): string {
  try {
    const decimals = getDefaultDecimals(contractAddress)
    return formatUnits(value, decimals)
  } catch {
    return '0'
  }
}

// Helper to parse values with correct decimals
export function parseWithDecimals(value: string, contractAddress: string): bigint {
  try {
    const decimals = getDefaultDecimals(contractAddress)
    // This function would need the parseUnits from ethers
    // For now, we'll return a placeholder
    return BigInt(0)
  } catch {
    return 0n
  }
}

// Token metadata helper
export function getTokenMetadata(contractAddress: string): { symbol: string; decimals: number; type: string } {
  const lowerAddr = contractAddress.toLowerCase()
  
  const metadata: Record<string, { symbol: string; decimals: number; type: string }> = {
    // UI Mock tokens
    [CONTRACT_ADDRESSES.UI_MOCK_USDC.toLowerCase()]: { symbol: 'uiUSDC', decimals: 6, type: 'mock' },
    [CONTRACT_ADDRESSES.UI_MOCK_ETH.toLowerCase()]: { symbol: 'uiETH', decimals: 18, type: 'mock' },
    [CONTRACT_ADDRESSES.UI_MOCK_BTC.toLowerCase()]: { symbol: 'uiBTC', decimals: 8, type: 'mock' },
    
    // Mock tokens
    [CONTRACT_ADDRESSES.MOCK_USDC.toLowerCase()]: { symbol: 'USDC', decimals: 6, type: 'mock' },
    [CONTRACT_ADDRESSES.MOCK_ETH.toLowerCase()]: { symbol: 'ETH', decimals: 18, type: 'mock' },
    [CONTRACT_ADDRESSES.MOCK_BTC.toLowerCase()]: { symbol: 'BTC', decimals: 8, type: 'mock' },
    
    // Anthem tokens
    [CONTRACT_ADDRESSES.ANTHEM_SENIOR.toLowerCase()]: { symbol: 'sANTHEM', decimals: 6, type: 'senior' },
    [CONTRACT_ADDRESSES.ANTHEM_JUNIOR.toLowerCase()]: { symbol: 'jANTHEM', decimals: 6, type: 'junior' },
    [CONTRACT_ADDRESSES.SOVEREIGN_POOL.toLowerCase()]: { symbol: 'ANTHEM-LP', decimals: 18, type: 'lp' },
  }
  
  const result = metadata[lowerAddr]
  if (result) {
    return result
  }
  
  // Check if it's a known contract but not in metadata
  const decimals = getDefaultDecimals(contractAddress)
  return { symbol: 'UNKNOWN', decimals, type: 'unknown' }
}

// Format balance with symbol
export function formatBalanceWithSymbol(balance: string, contractAddress: string): string {
  const metadata = getTokenMetadata(contractAddress)
  return `${balance} ${metadata.symbol}`
}

// Debug function to log all token decimals
export function logTokenDecimals(): void {
  console.log('📊 TOKEN DECIMALS CONFIGURATION:')
  
  const tokens = [
    { name: 'UI_MOCK_USDC', address: CONTRACT_ADDRESSES.UI_MOCK_USDC },
    { name: 'UI_MOCK_ETH', address: CONTRACT_ADDRESSES.UI_MOCK_ETH },
    { name: 'UI_MOCK_BTC', address: CONTRACT_ADDRESSES.UI_MOCK_BTC },
    { name: 'MOCK_USDC', address: CONTRACT_ADDRESSES.MOCK_USDC },
    { name: 'MOCK_ETH', address: CONTRACT_ADDRESSES.MOCK_ETH },
    { name: 'MOCK_BTC', address: CONTRACT_ADDRESSES.MOCK_BTC },
    { name: 'ANTHEM_SENIOR', address: CONTRACT_ADDRESSES.ANTHEM_SENIOR },
    { name: 'ANTHEM_JUNIOR', address: CONTRACT_ADDRESSES.ANTHEM_JUNIOR },
    { name: 'SOVEREIGN_POOL', address: CONTRACT_ADDRESSES.SOVEREIGN_POOL },
  ]
  
  tokens.forEach(token => {
    const decimals = getDefaultDecimals(token.address)
    console.log(`  ${token.name}: ${decimals} decimals (${token.address.slice(0, 10)}...)`)
  })
}

export const getSovereignPoolBalances = async (
  provider: any,
  addresses: typeof CONTRACT_ADDRESSES
) => {
  try {
    const { ERC20_ABI } = await import('./abis')
    
    // Check USDC balance
    const usdcContract = new Contract(
      addresses.UI_MOCK_USDC,
      ERC20_ABI,
      provider
    )
    const usdcBalance = await usdcContract.balanceOf(addresses.SOVEREIGN_POOL)
    
    // Check sANTHEM balance
    const sAnthemContract = new Contract(
      addresses.ANTHEM_SENIOR,
      ERC20_ABI,
      provider
    )
    const sAnthemBalance = await sAnthemContract.balanceOf(addresses.SOVEREIGN_POOL)
    
    // Check jANTHEM balance
    const jAnthemContract = new Contract(
      addresses.ANTHEM_JUNIOR,
      ERC20_ABI,
      provider
    )
    const jAnthemBalance = await jAnthemContract.balanceOf(addresses.SOVEREIGN_POOL)
    
    return {
      usdc: formatUnits(usdcBalance, 6),
      sAnthem: formatUnits(sAnthemBalance, 6),
      jAnthem: formatUnits(jAnthemBalance, 6)
    }
  } catch (error) {
    console.error('Failed to get Sovereign Pool balances:', error)
    return {
      usdc: '0',
      sAnthem: '0',
      jAnthem: '0'
    }
  }
}