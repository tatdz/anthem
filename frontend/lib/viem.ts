// lib/viem.ts
'use client'
import { createPublicClient, http, defineChain } from 'viem'
import { CONTRACT_ADDRESSES } from './constants'

// Client-side only - uses secure API route
const arbitrumSepolia = defineChain({
  id: 421614,
  name: 'Arbitrum Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    // Custom transport that calls our secure API
    default: {
      http: ['/api/rpc'], // Uses our secure proxy
    },
  },
  blockExplorers: {
    default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
  },
})

// Custom transport that calls our secure API
const customTransport = http('/api/rpc')

export const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: customTransport,
})