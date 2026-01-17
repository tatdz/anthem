// lib/abis/anthem-vault.ts
export const ANTHEM_VAULT_ABI = [
  // Main deposit function
  {
    inputs: [{ internalType: "uint256", name: "usdcAmount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Withdraw function
  {
    inputs: [{ internalType: "uint256", name: "lpTokenAmount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // View functions
  {
    inputs: [],
    name: "totalDeposited",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalLPTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getVaultOverview",
    outputs: [
      { internalType: "uint256", name: "totalUSDC", type: "uint256" },
      { internalType: "uint256", name: "totalLPTokens_", type: "uint256" },
      { internalType: "uint256", name: "seniorRatioBps", type: "uint256" },
      { internalType: "uint256", name: "juniorRatioBps", type: "uint256" },
      { internalType: "uint256", name: "priorityScore", type: "uint256" },
      { internalType: "bool", name: "poolInitialized", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserPosition",
    outputs: [
      { internalType: "uint256", name: "totalDeposited_", type: "uint256" },
      { internalType: "uint256", name: "lpTokens_", type: "uint256" },
      { internalType: "uint256", name: "lastUpdated_", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "depositAmount", type: "uint256" }],
    name: "calculateAllocation",
    outputs: [
      { internalType: "uint256", name: "seniorAmount", type: "uint256" },
      { internalType: "uint256", name: "juniorAmount", type: "uint256" },
      { internalType: "uint256", name: "seniorBps", type: "uint256" },
      { internalType: "uint256", name: "juniorBps", type: "uint256" },
      { internalType: "uint256", name: "priorityScore_", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // NEW: getVaultTokenBalances function
  {
    inputs: [],
    name: "getVaultTokenBalances",
    outputs: [
      { internalType: "uint256", name: "usdcBalance", type: "uint256" },
      { internalType: "uint256", name: "seniorBalance", type: "uint256" },
      { internalType: "uint256", name: "juniorBalance", type: "uint256" },
      { internalType: "uint256", name: "lpBalance", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // NEW: initializePoolWithExistingTokens function
  {
    inputs: [],
    name: "initializePoolWithExistingTokens",
    outputs: [{ internalType: "uint256", name: "lpTokens", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  // NEW: manualAddLiquidity function
  {
    inputs: [
      { internalType: "uint256", name: "seniorAmount", type: "uint256" },
      { internalType: "uint256", name: "juniorAmount", type: "uint256" }
    ],
    name: "manualAddLiquidity",
    outputs: [{ internalType: "uint256", name: "lpTokens", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  // State variables getters
  {
    inputs: [],
    name: "usdc",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "senior",
    outputs: [{ internalType: "contract AnthemSenior", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "junior",
    outputs: [{ internalType: "contract AnthemJunior", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "pool",
    outputs: [{ internalType: "contract SovereignPool", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "oracle",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Constants
  {
    inputs: [],
    name: "MAX_DEPOSIT_AMOUNT",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Owner functions
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "recoverTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // User positions
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "userPositions",
    outputs: [
      { internalType: "uint256", name: "totalDeposited", type: "uint256" },
      { internalType: "uint256", name: "lpTokens", type: "uint256" },
      { internalType: "uint256", name: "lastUpdated", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "usdcAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "lpTokens", type: "uint256" }
    ],
    name: "Deposit",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "usdcAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "lpTokensBurned", type: "uint256" }
    ],
    name: "Withdraw",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "seniorBps", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "juniorBps", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "priorityScore", type: "uint256" }
    ],
    name: "TrancheRatioUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" }
    ],
    name: "OwnershipTransferred",
    type: "event"
  }
] as const;