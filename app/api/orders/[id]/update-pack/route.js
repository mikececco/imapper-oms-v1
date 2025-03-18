import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY } from '../../../../utils/env';

// Create a server-side Supabase client
const supabase = createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY);

export async function POST(request) {
  try {
    // Extract the ID from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 2]; // Get the ID from the URL path
    
    const { orderPack, orderPackId, orderPackLabel, weight, order_pack_quantity } = await request.json();

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

    // Validate quantity
    const quantity = parseInt(order_pack_quantity) || 1;
    if (quantity < 1 || quantity > 100) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Update the order in Supabase
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        order_pack: orderPack,
        order_pack_list_id: orderPackId,
        order_pack_label: orderPackLabel,
        order_pack_quantity: quantity,
        weight: weight,
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

    return NextResponse.json({ 
      success: true, 
      message: 'Order pack updated successfully',
      data
    });
  } catch (error) {
    console.error('Error in update-pack route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 