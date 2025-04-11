import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY } from '../../../../utils/env';

// Create a server-side Supabase client
const supabase = createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY);

export async function POST(request, { params }) {
  const { orderId } = params;
  const { manual_instruction } = await request.json();

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  if (!manual_instruction) {
    return NextResponse.json({ error: 'Manual instruction is required' }, { status: 400 });
  }

  try {
    // Prepare the update object
    let updateData = {
      manual_instruction: manual_instruction,
      updated_at: new Date().toISOString(), // Update timestamp
    };
    
    // If manual_instruction is 'delivered', also update status
    if (manual_instruction.toLowerCase() === 'delivered') {
      updateData.status = 'Delivered';
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select();

    if (error) {
      console.error('Supabase error updating order instruction:', error);
      throw new Error(error.message);
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Order not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true, updatedOrder: data[0] });

  } catch (error) {
    console.error('Error setting order instruction:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
} 