import { NextResponse } from 'next/server';
import { runAllScheduledTasks, scheduledDeliveryStatusUpdate } from '../../utils/scheduled-tasks';

/**
 * Run specific or all scheduled tasks via POST
 * 
 * POST /api/scheduled-tasks?task=delivery-status
 * POST /api/scheduled-tasks
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const task = searchParams.get('task');
    
    // If a specific task is requested via POST, run only that task
    if (task === 'delivery-status') {
      console.log('[API] Running scheduled delivery status update via POST...');
      const result = await scheduledDeliveryStatusUpdate();
      return NextResponse.json(result);
    }
    
    // Otherwise (no specific task via POST), run all scheduled tasks
    console.log('[API] Running all scheduled tasks via POST...');
    const results = await runAllScheduledTasks();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error running scheduled tasks via POST:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Run the delivery status update task via GET (for Cron)
 * 
 * GET /api/scheduled-tasks 
 */
export async function GET(request) {
  // Protect this GET endpoint - Vercel automatically adds a secret header for cron jobs
  // You should verify this header for security if the endpoint is sensitive
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
     console.warn('[API] Unauthorized GET request to scheduled-tasks (Cron). Missing or invalid CRON_SECRET.');
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[API] Running scheduled delivery status update via GET (Cron)...');
    // Directly call the delivery status update function for GET requests (intended for cron)
    const result = await scheduledDeliveryStatusUpdate(); 
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running scheduled delivery status update via GET (Cron):', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 