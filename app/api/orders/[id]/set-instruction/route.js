import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY } from '../../../../utils/env';

// Create a server-side Supabase client
const supabase = createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY);

export async function POST(request, { params }) {
  try {
    const { id } = params; // Get order ID from the route parameters
    const { manual_instruction } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Allow setting instruction to null/empty to clear the override
    // if (!manual_instruction) {
    //   return NextResponse.json({ error: 'Instruction text is required' }, { status: 400 });
    // }

    console.log(`Setting manual instruction for order ${id} to: "${manual_instruction || 'NULL'}"`);

    // Update the order in Supabase
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        manual_instruction: manual_instruction,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating manual instruction:', error);
      return NextResponse.json({ error: 'Failed to update manual instruction' }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Manual instruction updated successfully',
      order: data
    });

  } catch (error) {
    console.error('Error setting manual instruction:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
} 