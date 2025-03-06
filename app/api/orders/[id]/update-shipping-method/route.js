import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a server-side Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request) {
  try {
    // Extract the ID from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 2]; // Get the ID from the URL path
    
    const { shipping_method } = await request.json();
    
    if (!shipping_method) {
      return NextResponse.json({ error: 'Shipping method is required' }, { status: 400 });
    }
    
    // Validate shipping method
    const validMethods = ['standard', 'express', 'priority', 'economy'];
    if (!validMethods.includes(shipping_method)) {
      return NextResponse.json({ 
        error: `Invalid shipping method. Must be one of: ${validMethods.join(', ')}` 
      }, { status: 400 });
    }
    
    // Update the order with the new shipping method
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        shipping_method,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error updating shipping method:', error);
      return NextResponse.json({ error: 'Failed to update shipping method' }, { status: 500 });
    }
    
    // After updating the shipping method, update the instruction
    try {
      await supabase.rpc('update_order_instruction', { order_id: id });
    } catch (instructionError) {
      console.error('Error updating order instruction:', instructionError);
      // Continue even if instruction update fails
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Shipping method updated successfully',
      data
    });
    
  } catch (error) {
    console.error('Error in update-shipping-method API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 