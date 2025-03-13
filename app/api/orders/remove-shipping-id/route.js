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

    // Update the order to remove shipping-related fields
    const { error } = await supabase
      .from('orders')
      .update({
        shipping_id: null,
        tracking_number: null,
        tracking_link: null,
        label_url: null,
        sendcloud_data: null,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error removing shipping ID:', error);
      return NextResponse.json({ error: 'Failed to remove shipping ID' }, { status: 500 });
    }

    // Create an activity log entry
    const { error: activityError } = await supabase
      .from('order_activities')
      .insert([{
        order_id: orderId,
        action_type: 'order_update',
        changes: {
          shipping_id: {
            old_value: data.shipping_id,
            new_value: null
          },
          tracking_number: {
            old_value: data.tracking_number,
            new_value: null
          },
          tracking_link: {
            old_value: data.tracking_link,
            new_value: null
          },
          status: {
            old_value: data.status,
            new_value: 'pending'
          }
        },
        created_at: new Date().toISOString()
      }]);

    if (activityError) {
      console.error('Error creating activity log:', activityError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Shipping ID and related information removed successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 