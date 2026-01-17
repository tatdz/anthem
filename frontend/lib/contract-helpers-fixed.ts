// lib/contract-helpers-fixed.ts 
import { BrowserProvider, Contract } from 'ethers'
import { CONTRACT_ADDRESSES } from './contract-helpers'
import * as abis from './abis'

export async function getContractWithFallback(
  provider: BrowserProvider,
  contractName: string,
  address: string,
  abi: readonly any[]
): Promise<Contract | null> {
  try {
    // Check if contract is deployed
    const code = await provider.getCode(address)
    if (!code || code === '0x' || code === '0x0') {
      console.warn(`Contract ${contractName} not deployed at ${address}`)
      return null
    }
    
    return new Contract(address, abi, provider)
  } catch (error) {
    console.error(`Failed to create contract ${contractName}:`, error)
    return null
  }
}

export async function callContractMethod(
  contract: Contract,
  method: string,
  args: any[] = [],
  fallbackValue: any = null
): Promise<any> {
  try {
    if (!contract[method]) {
      throw new Error(`Method ${method} not found on contract`)
    }
    
    const result = await contract[method](...args)
    
    // Check if result is empty
    if (result === '0x' || result === undefined) {
      return fallbackValue
    }
    
    return result
  } catch (error) {
    console.error(`Failed to call ${method}:`, error)
    return fallbackValue
  }
}

// Pre-defined contracts with proper error handling
export async function getContracts(provider: BrowserProvider) {
  const contracts: Record<string, Contract | null> = {}
  
  // Oracle
  contracts.oracle = await getContractWithFallback(
    provider,
    'CoreWriterOracle',
    CONTRACT_ADDRESSES.COREWRITER_ORACLE,
    abis.COREWRITER_ORACLE_ABI
  )
  
  // Vault
  contracts.vault = await getContractWithFallback(
    provider,
    'AnthemVault',
    CONTRACT_ADDRESSES.ANTHEM_VAULT,
    abis.ANTHEM_VAULT_ABI
  )
  
  // Pool
  contracts.pool = await getContractWithFallback(
    provider,
    'SovereignPool',
    CONTRACT_ADDRESSES.SOVEREIGN_POOL,
    abis.SOVEREIGN_POOL_ABI
  )
  
  // Tokens
  contracts.mockUsdc = await getContractWithFallback(
    provider,
    'MockUSDC',
    CONTRACT_ADDRESSES.MOCK_USDC,
    abis.MOCK_USDC_ABI
  )
  
  contracts.senior = await getContractWithFallback(
    provider,
    'AnthemSenior',
    CONTRACT_ADDRESSES.ANTHEM_SENIOR,
    abis.ANTHEM_SENIOR_ABI
  )
  
  contracts.junior = await getContractWithFallback(
    provider,
    'AnthemJunior',
    CONTRACT_ADDRESSES.ANTHEM_JUNIOR,
    abis.ANTHEM_JUNIOR_ABI
  )
  
  return contracts
}