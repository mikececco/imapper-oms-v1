import { supabase } from '../../../../utils/supabase-client';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { id } = params;
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