import { NextResponse } from 'next/server';
import { runAllScheduledTasks, scheduledDeliveryStatusUpdate } from '../../utils/scheduled-tasks';

/**
 * Run all scheduled tasks
 * 
 * POST /api/scheduled-tasks
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const task = searchParams.get('task');
    
    // If a specific task is requested, run only that task
    if (task === 'delivery-status') {
      const result = await scheduledDeliveryStatusUpdate();
      return NextResponse.json(result);
    }
    
    // Otherwise, run all scheduled tasks
    const results = await runAllScheduledTasks();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error running scheduled tasks:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 