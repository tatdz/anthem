// app/api/rpc/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, defineChain } from 'viem'

// Server-side only - environment variables not exposed to browser
const RPC_URL = process.env.ALCHEMY_ARBITRUM_TESTNET_URL!

const arbitrumSepolia = defineChain({
  id: 421614,
  name: 'Arbitrum Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
  },
})

export async function POST(request: NextRequest) {
  try {
    const { method, params } = await request.json()
    
    const client = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(RPC_URL),
    })
    
    // Forward RPC call server-side
    const result = await client.transport.request({
      method,
      params,
    })
    
    return NextResponse.json({ result })
  } catch (error) {
    console.error('RPC error:', error)
    return NextResponse.json(
      { error: 'RPC call failed' },
      { status: 500 }
    )
  }
}