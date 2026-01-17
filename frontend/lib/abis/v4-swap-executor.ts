// lib/abis/v4-swap-executor.ts
export const V4_SWAP_EXECUTOR_ABI = [
  // Main functions
  {
    inputs: [
      { internalType: "bool", name: "zeroForOne", type: "bool" },
      { internalType: "uint256", name: "amountIn", type: "uint256" }
    ],
    name: "executeRealBtcUsdcSwap",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bool", name: "zeroForOne", type: "bool" },
      { internalType: "uint256", name: "amountIn", type: "uint256" }
    ],
    name: "executeRealEthUsdcSwap",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  // View functions
  {
    inputs: [],
    name: "getBalances",
    outputs: [
      { internalType: "uint256", name: "btcBalance", type: "uint256" },
      { internalType: "uint256", name: "ethBalance", type: "uint256" },
      { internalType: "uint256", name: "usdcBalance", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;