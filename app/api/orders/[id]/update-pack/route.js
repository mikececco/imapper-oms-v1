import { NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabase-client';

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { orderPack } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!orderPack && orderPack !== '') {
      return NextResponse.json(
        { error: 'Order pack is required' },
        { status: 400 }
      );
    }

    // Update the order in Supabase
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        order_pack: orderPack,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating order pack:', error);
      return NextResponse.json(
        { error: 'Failed to update order pack' },
        { status: 500 }
      );
    }

    // After updating the order pack, update the instruction
    try {
      await supabase.rpc('update_order_instruction', { order_id: id });
    } catch (instructionError) {
      console.error('Error updating order instruction:', instructionError);
      // Continue even if instruction update fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Order pack updated successfully',
      data
    });
  } catch (error) {
    console.error('Error in update-pack API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 