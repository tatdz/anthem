// lib/abis/sovereign-pool.ts
export const SOVEREIGN_POOL_ABI = [
  // View functions
  {
    inputs: [],
    name: "reserve0",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "reserve1",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "lastUpdated",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "alm",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // ERC20 functions
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  // Pool state functions
  {
    inputs: [],
    name: "getPoolState",
    outputs: [
      { internalType: "uint256", name: "_reserve0", type: "uint256" },
      { internalType: "uint256", name: "_reserve1", type: "uint256" },
      { internalType: "uint256", name: "_totalLiquidity", type: "uint256" },
      { internalType: "uint256", name: "_price0To1", type: "uint256" },
      { internalType: "uint256", name: "_price1To0", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { internalType: "uint256", name: "_reserve0", type: "uint256" },
      { internalType: "uint256", name: "_reserve1", type: "uint256" },
      { internalType: "uint256", name: "_timestamp", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Write functions
  {
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "mint",
    outputs: [{ internalType: "uint256", name: "liquidity", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "burn",
    outputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bool", name: "isZeroToOne", type: "bool" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMin", type: "uint256" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "bytes", name: "swapContext", type: "bytes" }
    ],
    name: "swap",
    outputs: [
      { internalType: "uint256", name: "amountInUsed", type: "uint256" },
      { internalType: "uint256", name: "amountOut", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Liquidity functions
  {
    inputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "bytes", name: "verificationContext", type: "bytes" },
      { internalType: "bytes", name: "depositData", type: "bytes" }
    ],
    name: "depositLiquidity",
    outputs: [
      { internalType: "uint256", name: "amount0Deposited", type: "uint256" },
      { internalType: "uint256", name: "amount1Deposited", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount0", type: "uint256" },
      { internalType: "uint256", name: "amount1", type: "uint256" },
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "bytes", name: "verificationContext", type: "bytes" }
    ],
    name: "withdrawLiquidity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Admin functions
  {
    inputs: [{ internalType: "address", name: "_alm", type: "address" }],
    name: "setALM",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "sync",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;