// app/api/automation/status/route.ts
import { NextResponse } from 'next/server'

// In-memory store for automation status (use Redis in production)
let automationStatus = {
  running: false,
  lastEvent: null as any,
  eventsExecuted: 0,
  nextEventIn: 15,
  recentTransactions: [] as any[]
}

export async function GET() {
  return NextResponse.json({
    ...automationStatus,
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, event, transaction } = body
    
    if (action === 'start') {
      automationStatus.running = true
      automationStatus.nextEventIn = 15
    } else if (action === 'stop') {
      automationStatus.running = false
    } else if (action === 'event-executed') {
      automationStatus.eventsExecuted++
      automationStatus.lastEvent = event
      automationStatus.nextEventIn = 15
    } else if (action === 'tick') {
      automationStatus.nextEventIn = Math.max(0, automationStatus.nextEventIn - 1)
    } else if (action === 'add-transaction' && transaction) {
      automationStatus.recentTransactions = [transaction, ...automationStatus.recentTransactions].slice(0, 20)
    }
    
    return NextResponse.json({
      success: true,
      status: automationStatus
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}