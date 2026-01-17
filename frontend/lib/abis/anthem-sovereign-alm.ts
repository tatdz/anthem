export const ANTHEM_SOVEREIGN_ALM_ABI = [
  // View functions
  {
    inputs: [],
    name: "pool",
    outputs: [{ internalType: "contract SovereignPool", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "anthemVault",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "coreWriterOracle",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Main functions
  {
    inputs: [
      { internalType: "uint256", name: "seniorAmount", type: "uint256" },
      { internalType: "uint256", name: "juniorAmount", type: "uint256" },
      { internalType: "bytes", name: "verificationContext", type: "bytes" }
    ],
    name: "provideAnthemLiquidity",
    outputs: [
      { internalType: "uint256", name: "deposited0", type: "uint256" },
      { internalType: "uint256", name: "deposited1", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "totalUsdc", type: "uint256" }
    ],
    name: "getDynamicAllocation",
    outputs: [
      { internalType: "uint256", name: "seniorAllocation", type: "uint256" },
      { internalType: "uint256", name: "juniorAllocation", type: "uint256" },
      { internalType: "uint256", name: "priorityScore", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // View helper functions
  {
    inputs: [{ internalType: "address", name: "vault", type: "address" }],
    name: "getVaultPosition",
    outputs: [
      { internalType: "uint256", name: "totalSenior", type: "uint256" },
      { internalType: "uint256", name: "totalJunior", type: "uint256" },
      { internalType: "uint256", name: "lpTokens", type: "uint256" },
      { internalType: "uint256", name: "lastUpdated", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getPoolReserves",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Admin functions
  {
    inputs: [{ internalType: "address", name: "_oracle", type: "address" }],
    name: "setCoreWriterOracle",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Emergency recovery
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "recoverTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;