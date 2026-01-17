// lib/contract-helpers.ts
import { Contract } from 'ethers';

export const CONTRACT_ADDRESSES = {
  // 🎯 DEPLOYED CONTRACTS - LATEST DEPLOYMENT (FIXED VAULT)
  ANTHEM_SENIOR: "0x44f2f69af1d92a1d572dcAD512d0aBBC93B0631c",
  ANTHEM_JUNIOR: "0x612b59DE2116D2aD143Cc682b7050a8d1ea710A2",
  SOVEREIGN_POOL: "0xF8CB819086Fd034450197f1Fd4CA8B2542953834",
  ANTHEM_VAULT: "0x7c8aa139D6dB1BeBcd26299b3ee963E91c23800e",
  ANTHEM_LENDING_MODULE: "0xca5b11a3f14E410dEddfc1B53226E0fB0655C252",
  ANTHEM_SOVEREIGN_ALM: "0x0687eb62257c425AE9DaBE0B85C8F5781E63Cf29",
  COREWRITER_ORACLE: "0xA98BE8D7896C26edD7166b6F046026Aa8F8b8C37",
  MOCK_L1_READ: "0x86cA01b5a3898750013C816aCcda2238506D608A",
  MOCK_CORE_WRITER: "0x2463CD6E16Ea28E76D646c7f56288a7Cb263F05A",
  
  // V4 Addresses
  V4_SWAP_EXECUTOR: "0xb8aD836c8a31Dc7fD842b4b328f39f3d3aa6F781",
  
  // MOCK TOKENS (Arbitrum Sepolia)
  MOCK_BTC: "0x525F87c067c669FCC037C86e493F137870Da37cf",
  MOCK_ETH: "0xA210e112825a120B4aaB5F8fDD9dd700b0A5c3DE",
  MOCK_USDC: "0xd0c9a47E83f5dD0F40671D621454c370fcf601Db",
  USDC_WRAPPER: '0xDE1909cACcdE9f3A1d3dccc98d3A167f7f5f6521',

  // UI MOCK TOKENS (with faucet function)
  UI_MOCK_USDC: "0x164D636e9c513472E310a17c55B6C78994bF5307",
  UI_MOCK_ETH: "0x4d25fD9A4ECD62Bc2C61F1cc1229b660296E0d03",
  UI_MOCK_BTC: "0x8C46d0f2D9822DbdE9794460712f50b3b69BD6d9",

  // V4 Addresses
  POOL_MANAGER: "0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317",
  POSITION_MANAGER: "0xAc631556d3d4019C95769033B5E719dD77124BAc",
  POOL_SWAP_TEST: "0xf3A39C86dbd13C45365E57FB90fe413371F65AF8",
  HOOK_ADDRESS: "0x5c087519b91f90c66f24ff13fd48f262427ccac0",
  
  // Pool IDs
  BTC_USDC_POOL_ID: "0x1dd8c051c7fc03e6d22c98be140f43f7443f7553826817cda2115ace5ae1b3aa",
  ETH_USDC_POOL_ID: "0x3b7a8b2f53613e34d3c8df21673da84ab403788442e775f4103afa8018c99546",
  
  // Arbiscan
  ARBISCAN_BASE: "https://sepolia.arbiscan.io"
} as const;

// Environment variables mapping
export const ENV_ADDRESSES = {
  // CORE ANTHEM CONTRACTS - NEW DEPLOYMENT
  NEXT_PUBLIC_ANTHEM_SENIOR: "0x44f2f69af1d92a1d572dcAD512d0aBBC93B0631c",
  NEXT_PUBLIC_ANTHEM_JUNIOR: "0x612b59DE2116D2aD143Cc682b7050a8d1ea710A2",
  NEXT_PUBLIC_SOVEREIGN_POOL: "0xF8CB819086Fd034450197f1Fd4CA8B2542953834",
  NEXT_PUBLIC_ANTHEM_VAULT: "0x7c8aa139D6dB1BeBcd26299b3ee963E91c23800e",
  NEXT_PUBLIC_ANTHEM_LENDING_MODULE: "0xca5b11a3f14E410dEddfc1B53226E0fB0655C252",
  NEXT_PUBLIC_ANTHEM_SOVEREIGN_ALM: "0x0687eb62257c425AE9DaBE0B85C8F5781E63Cf29",
  NEXT_PUBLIC_MOCK_L1_READ: "0x86cA01b5a3898750013C816aCcda2238506D608A",
  NEXT_PUBLIC_MOCK_CORE_WRITER: "0x2463CD6E16Ea28E76D646c7f56288a7Cb263F05A",
  NEXT_PUBLIC_COREWRITER_ORACLE: "0xA98BE8D7896C26edD7166b6F046026Aa8F8b8C37",
  NEXT_PUBLIC_V4_SWAP_EXECUTOR: "0xb8aD836c8a31Dc7fD842b4b328f39f3d3aa6F781",
} as const;

// Enhanced logger with transaction tracking
export const logger = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const log = { type: 'info', message, data, timestamp };
    console.log(`📝 [${timestamp}] ${message}`, data || '');
    saveLog(log);
    return log;
  },
  
  tx: (txHash: string, action: string, contract: string, details?: any) => {
    const link = `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/tx/${txHash}`;
    const timestamp = new Date().toISOString();
    console.log(`✅ ${action}: ${txHash}`);
    console.log(`🔗 View: ${link}`);
    console.log('📊 Details:', details || '');
    
    // Also log to session storage
    if (typeof window !== 'undefined') {
      const txs = JSON.parse(localStorage.getItem('real_transactions') || '[]');
      txs.unshift({
        hash: txHash,
        action,
        contract,
        link,
        details,
        timestamp,
        status: 'pending'
      });
      localStorage.setItem('real_transactions', JSON.stringify(txs.slice(0, 20)));
    }
    
    const log = { 
      type: 'transaction', txHash, action, contract, link, 
      details, timestamp, status: 'pending'
    };
    saveLog(log);
    saveTransaction(log);
    return log;
  },
  
  error: (message: string, error: any) => {
    const timestamp = new Date().toISOString();
    console.error(`❌ ${message}:`, error);
    console.error('Stack:', error.stack);
    
    const log = { 
      type: 'error', message, 
      error: error.message, 
      stack: error.stack,
      timestamp 
    };
    saveLog(log);
    return log;
  },
  
  success: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`✅ ${message}`, data || '');
    
    const log = { type: 'success', message, data, timestamp };
    saveLog(log);
    return log;
  }
};

// 🎯 SESSION STORAGE PER WALLET
export const session = {
  save: (key: string, data: any, address?: string) => {
    if (typeof window !== 'undefined') {
      const storageKey = address 
        ? `anthem_${address.slice(0, 8)}_${key}` 
        : `anthem_${key}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  },
  
  load: (key: string, address?: string) => {
    if (typeof window !== 'undefined') {
      const storageKey = address 
        ? `anthem_${address.slice(0, 8)}_${key}` 
        : `anthem_${key}`;
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    }
    return null;
  },
  
  clearUser: (address: string) => {
    if (typeof window !== 'undefined') {
      const prefix = `anthem_${address.slice(0, 8)}_`;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
    }
  },
  
  clearAll: () => {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('anthem_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }
};

// 🎯 HELPER FUNCTIONS
function saveLog(log: any) {
  const logs = session.load('logs') || [];
  logs.unshift(log);
  if (logs.length > 50) logs.pop();
  session.save('logs', logs);
}

function saveTransaction(tx: any) {
  const txs = session.load('transactions') || [];
  txs.unshift(tx);
  if (txs.length > 20) txs.pop();
  session.save('transactions', txs);
}

// 🎯 CONTRACT LINKS FOR UI
export const getContractLinks = () => ({
  vault: `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.ANTHEM_VAULT}`,
  senior: `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.ANTHEM_SENIOR}`,
  junior: `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.ANTHEM_JUNIOR}`,
  pool: `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.SOVEREIGN_POOL}`,
  lending: `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.ANTHEM_LENDING_MODULE}`,
  alm: `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.ANTHEM_SOVEREIGN_ALM}`,
  oracle: `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.COREWRITER_ORACLE}`,
  mockL1: `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.MOCK_L1_READ}`,
  mockCore: `${CONTRACT_ADDRESSES.ARBISCAN_BASE}/address/${CONTRACT_ADDRESSES.MOCK_CORE_WRITER}`,
});

export const UI_MOCK_TOKEN_ADDRESSES = {
  UI_MOCK_USDC: CONTRACT_ADDRESSES.UI_MOCK_USDC,
  UI_MOCK_ETH: CONTRACT_ADDRESSES.UI_MOCK_ETH,
  UI_MOCK_BTC: CONTRACT_ADDRESSES.UI_MOCK_BTC,
};

// Contract ABI function signatures for common calls
export const CONTRACT_FUNCTIONS = {
  // AnthemJunior functions
  JUNIOR: {
    DEPOSIT: "deposit(uint256,address)",
    REDEEM: "redeem(uint256)",
    PREVIEW_REDEEM: "previewRedeem(uint256)",
    GET_ORACLE_PRIORITY_SCORE: "getOraclePriorityScore()",
    GET_JUNIOR_METRICS: "getJuniorMetrics()",
    SET_CORE_WRITER_ORACLE: "setCoreWriterOracle(address)",
    SET_VAULT: "setVault(address)",
  },
  
  // AnthemVault functions
  VAULT: {
    DEPOSIT: "deposit(uint256)",
    WITHDRAW: "withdraw(uint256)",
    FUND_LENDING_MODULE: "fundLendingModule(uint256)",
    GET_VAULT_OVERVIEW: "getVaultOverview()",
    SET_LENDING_MODULE: "setLendingModule(address)",
    SET_ALM: "setALM(address,bool)",
  },
  
  // AnthemLendingModule functions
  LENDING: {
    ASSET_BALANCE: "assetBalance()",
    DEPOSIT: "deposit(uint256)",
    WITHDRAW: "withdraw(uint256,address)",
    CREATE_LOAN: "createLoan(address,uint256,uint256)",
    GET_PROTOCOL_STATS: "getProtocolStats()",
    GET_RECOMMENDED_LTV: "getRecommendedLTV(address)",
  },
  
  // SovereignPool functions
  POOL: {
    GET_RESERVES: "getReserves()",
    BALANCE_OF: "balanceOf(address)",
    MINT: "mint(address)",
    BURN: "burn(address)",
    SET_ALM: "setALM(address)",
  },
  
  // AnthemSovereignALM functions
  ALM: {
    PROVIDE_ANTHEM_LIQUIDITY: "provideAnthemLiquidity(uint256,uint256,bytes)",
    WITHDRAW_ANTHEM_LIQUIDITY: "withdrawAnthemLiquidity(uint256,bytes)",
    GET_ALLOCATION: "getAllocation()",
  },
};

// Custom error signatures
export const CUSTOM_ERRORS = {
  // Common errors
  '0xfb8f41b2': 'TransferFailed()',
  '0x08c379a0': 'Error(string)', // Standard string error
  '0x4e487b71': 'Panic(uint256)',
  
  // RealLending errors
  '0x1f2a2005': 'InsufficientOutputAmount()',
  '0x15b5f17a': 'MaxDepositExceeded()',
  '0x3b4b57b0': 'PoolNotInitialized()',
  '0xe9c4a3ac': 'InvalidCollateral()',
  
  // Token errors
  '0xe450d38c': 'InsufficientBalance(address,uint256,uint256)',
  '0xa9059cbb': 'TransferFailed(address,address,uint256)',
  
  // Vault errors
  '0x5c34b249': 'InsufficientLiquidity()',
  '0x7e2897ef': 'ExceedsMaxDeposit()',
  
  // Lending module errors
  '0xbefd1060': 'AnthemLendingModule__OnlyTokenSweepManager()',
  '0xe6c4247b': 'AnthemLendingModule__InvalidCollateral()',
  '0x463d8775': 'AnthemLendingModule__LoanAmountExceedsLTV()',
} as const;

export function decodeCustomError(data: string): string {
  if (!data || data === '0x') return 'Unknown error (no data)';
  
  const errorSig = data.slice(0, 10); // First 4 bytes (8 chars + 0x)
  
  if (CUSTOM_ERRORS[errorSig as keyof typeof CUSTOM_ERRORS]) {
    const errorName = CUSTOM_ERRORS[errorSig as keyof typeof CUSTOM_ERRORS];
    
    // Special handling for string errors
    if (errorSig === '0x08c379a0') {
      try {
        // Remove the function selector
        const encodedString = data.slice(10);
        // String error encoding: offset (32 bytes) + length (32 bytes) + string
        const length = parseInt(encodedString.slice(64, 128), 16) * 2;
        const stringData = encodedString.slice(128, 128 + length);
        const decodedString = Buffer.from(stringData, 'hex').toString('utf-8');
        return `${errorName}: ${decodedString}`;
      } catch (e) {
        return `${errorName}(decode failed)`;
      }
    }
    
    // Special handling for InsufficientBalance error
    if (errorSig === '0xe450d38c') {
      try {
        const encodedData = data.slice(10);
        const address = '0x' + encodedData.slice(24, 64);
        const balance = parseInt(encodedData.slice(64, 128), 16);
        const required = parseInt(encodedData.slice(128, 192), 16);
        return `InsufficientBalance(account=${address}, balance=${balance}, required=${required})`;
      } catch (e) {
        return `${errorName}(decode failed)`;
      }
    }
    
    return errorName;
  }
  
  // Try to decode as panic error
  if (errorSig === '0x4e487b71') {
    try {
      const panicCode = parseInt(data.slice(10, 74), 16);
      const panicMessages: Record<number, string> = {
        0x00: 'generic panic',
        0x01: 'assert false',
        0x11: 'arithmetic overflow/underflow',
        0x12: 'division by zero',
        0x21: 'invalid enum value',
        0x22: 'invalid storage byte array',
        0x31: 'pop on empty array',
        0x32: 'array index out of bounds',
        0x41: 'out of memory',
        0x51: 'invalid internal function',
      };
      return `Panic(${panicMessages[panicCode] || `code ${panicCode}`})`;
    } catch (e) {
      return `Panic(decode failed)`;
    }
  }
  
  // Try to decode as generic string error (different encoding sometimes)
  if (data.includes('457863656564732041444c2d61646a7573746564204c5456')) {
    return 'Error: Exceeds ADL-adjusted LTV';
  }
  
  return `Unknown custom error: ${errorSig}`;
}

// Helper to format units (reusable)
export function formatUnits(value: bigint | string, decimals: number = 18): string {
  if (typeof value === 'string') {
    value = BigInt(value);
  }
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  
  if (fraction === 0n) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr}`;
}

// Helper to parse units
export function parseUnits(value: string, decimals: number = 18): bigint {
  if (!value) return 0n;
  
  const [whole, fraction = ''] = value.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  
  return BigInt(combined);
}

// Helper to get contract address with fallback
export function getContractAddress(key: keyof typeof CONTRACT_ADDRESSES): string {
  return CONTRACT_ADDRESSES[key];
}

// Helper to check if contract is deployed
export function isContractDeployed(address: string): boolean {
  return address !== '0x0000000000000000000000000000000000000000' && address !== '';
}