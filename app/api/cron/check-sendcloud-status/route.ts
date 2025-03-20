import { NextResponse } from 'next/server';
import { batchUpdateDeliveryStatus } from '../../../utils/sendcloud';

// Vercel cron job handler
export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Run the batch update
    const result = await batchUpdateDeliveryStatus();
    
    return NextResponse.json({
      success: true,
      message: 'SendCloud status check completed successfully',
      result
    });
  } catch (error) {
    console.error('Error in SendCloud status check cron:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 