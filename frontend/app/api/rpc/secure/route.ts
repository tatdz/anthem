// app/api/rpc/secure/route.ts 
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🔐 RPC Proxy called')
  
  try {
    // Parse the request body
    let body;
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError)
      return NextResponse.json({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32700,
          message: 'Parse error',
        }
      }, { status: 400 })
    }
    
    const { method, params } = body
    
    if (!method) {
      console.error('❌ Missing method in request')
      return NextResponse.json({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid Request: method is required',
        }
      }, { status: 400 })
    }
    
    console.log('🔐 Secure RPC call:', { method })
    
    // Make sure Alchemy URL is available
    const alchemyUrl = process.env.ALCHEMY_ARBITRUM_TESTNET_URL
    if (!alchemyUrl) {
      console.error('❌ Alchemy URL not configured')
      return NextResponse.json({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32603,
          message: 'Server configuration error',
        }
      }, { status: 500 })
    }
    
    // Forward to Alchemy
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params: params || [],
      }),
    })
    
    if (!response.ok) {
      console.error('❌ Alchemy RPC failed:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error response:', errorText)
      
      return NextResponse.json({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32603,
          message: `RPC provider error: ${response.statusText}`,
        }
      }, { status: response.status })
    }
    
    const data = await response.json()
    
    // Log for debugging
    console.log(`✅ RPC ${method} succeeded`)
    
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('❌ RPC Proxy error:', error.message)
    console.error('Stack:', error.stack)
    
    return NextResponse.json({
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32603,
        message: 'Internal server error',
        data: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    }, { status: 500 })
  }
}