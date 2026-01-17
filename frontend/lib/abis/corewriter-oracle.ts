// lib/abis/corewriter-oracle.ts
export const COREWRITER_ORACLE_ABI = [
  // View functions
  {
    inputs: [],
    name: "priorityScore",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "lastUpdate",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "BTC_USDC_POOL_ID",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "ETH_USDC_POOL_ID",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getTrancheRatios",
    outputs: [
      { internalType: "uint256", name: "seniorBps", type: "uint256" },
      { internalType: "uint256", name: "juniorBps", type: "uint256" },
      { internalType: "uint256", name: "currentPriorityScore", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getAdjustedLTV",
    outputs: [
      { internalType: "uint256", name: "seniorLTV", type: "uint256" },
      { internalType: "uint256", name: "juniorLTV", type: "uint256" },
      { internalType: "uint256", name: "adjustment", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Write functions
  {
    inputs: [
      { internalType: "bytes32", name: "poolId", type: "bytes32" },
      { internalType: "uint256", name: "volume", type: "uint256" },
      { internalType: "int24", name: "tickChange", type: "int24" },
      { internalType: "bool", name: "isStress", type: "bool" }
    ],
    name: "reportV4Swap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "newScore", type: "uint256" },
      { internalType: "string", name: "reason", type: "string" }
    ],
    name: "setPriorityScore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;