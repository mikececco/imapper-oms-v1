import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createReturnLabel } from '../../../utils/sendcloud';

const supabase = createClient(
  process.env.NEXT_SUPABASE_URL,
  process.env.NEXT_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { orderId, returnAddress } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!returnAddress || typeof returnAddress !== 'object' || !returnAddress.line1 || !returnAddress.city || !returnAddress.postal_code || !returnAddress.country) {
      return NextResponse.json(
        { error: 'Valid return address is required' },
        { status: 400 }
      );
    }

    // Fetch order details from Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Create return label using SendCloud
    const returnLabel = await createReturnLabel(order, returnAddress);

    // Update order with return label information
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        return_label_url: returnLabel.label_url,
        return_tracking_number: returnLabel.tracking_number,
        return_tracking_link: returnLabel.tracking_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      label_url: returnLabel.label_url,
      tracking_number: returnLabel.tracking_number,
      tracking_link: returnLabel.tracking_url
    });
  } catch (error) {
    console.error('Error creating return label:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create return label' },
      { status: 500 }
    );
  }
} 