// app/api/automation/swap/route.ts 
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // Check auth - you can disable for testing
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: 'Valid CRON_SECRET required'
    }, { status: 401 });
  }

  try {
    // Dynamically import the automation script
    const { executeSingleEvent } = await import('@/scripts/swap-automation.js');
    
    // Execute one event
    const result = await executeSingleEvent();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      event: {
        name: result.event?.name || 'Unknown Event',
        type: result.event?.type || 'AUTOMATION',
        asset: result.event?.asset || 'ETH',
        isStress: result.event?.isStress || false,
        jellyEvent: result.event?.jellyEvent || false
      },
      transactions: {
        swap: result.swapResult?.txInfo ? {
          success: true,
          hash: result.swapResult.txInfo.hash,
          arbiscanLink: result.swapResult.txInfo.arbiscanLink,
          block: result.swapResult.txInfo.blockNumber
        } : { 
          success: result.swapResult?.success || false, 
          error: result.swapResult?.error || 'No swap executed' 
        },
        oracle: result.oracleResult?.txInfo ? {
          success: true,
          hash: result.oracleResult.txInfo.hash,
          arbiscanLink: result.oracleResult.txInfo.arbiscanLink,
          block: result.oracleResult.txInfo.blockNumber
        } : { 
          success: result.oracleResult?.success || false, 
          error: result.oracleResult?.error || 'No oracle update' 
        }
      },
      state: {
        before: result.beforeState,
        after: result.afterState
      },
      priorityScore: result.afterState?.priorityScore || result.beforeState?.priorityScore
    });
    
  } catch (error: any) {
    console.error('Automation API error:', error);
    
    // More detailed error response
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, interval = 15 } = body;
    
    if (action === 'start') {
      // Start continuous automation (run in background)
      const { startAutomation } = await import('@/scripts/swap-automation.js');
      
      // Start in background (non-blocking)
      startAutomation(interval).catch(console.error);
      
      return NextResponse.json({
        success: true,
        message: 'Automation started in background',
        interval,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'stop') {
      // Note: To stop automation, you'd need to manage process IDs
      // For now, we'll just return success
      return NextResponse.json({
        success: true,
        message: 'Stop command sent (requires process management implementation)',
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'single-event') {
      // Execute single event
      const { executeSingleEvent } = await import('@/scripts/swap-automation.js');
      const result = await executeSingleEvent();
      
      return NextResponse.json({
        success: true,
        message: 'Single event executed',
        result,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Manual automation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}