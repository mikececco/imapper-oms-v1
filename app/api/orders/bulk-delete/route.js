import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY } from '../../../utils/env';

// Create a server-side Supabase client
const supabase = createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY);

export async function POST(request) {
  try {
    const { orderIds } = await request.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Order IDs array is required' }, { status: 400 });
    }

    // Delete the orders from Supabase
    const { error } = await supabase
      .from('orders')
      .delete()
      .in('id', orderIds);

    if (error) {
      console.error('Error deleting orders:', error);
      return NextResponse.json({ error: 'Failed to delete orders' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${orderIds.length} orders`
    });

  } catch (error) {
    console.error('Error in bulk delete API route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
} 