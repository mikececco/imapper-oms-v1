import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_SUPABASE_URL,
  process.env.NEXT_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get current order to toggle the important status
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('important')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }

    // Toggle the important status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        important: !order.important,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    // Create an activity log entry
    const { error: activityError } = await supabase
      .from('order_activities')
      .insert([{
        order_id: orderId,
        action_type: 'order_update',
        changes: {
          important: {
            old_value: order.important,
            new_value: !order.important
          }
        },
        created_at: new Date().toISOString()
      }]);

    if (activityError) {
      console.error('Error creating activity log:', activityError);
      // Don't return error here as the main operation succeeded
    }

    return NextResponse.json({ 
      success: true,
      important: !order.important
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 