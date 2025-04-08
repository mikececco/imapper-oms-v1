import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createReturnLabel } from '../../../utils/sendcloud';

const supabase = createClient(
  process.env.NEXT_SUPABASE_URL,
  process.env.NEXT_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    // Destructure all expected address objects
    const { orderId, returnFromAddress, returnToAddress } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    // Validate returnFromAddress (customer)
    if (!returnFromAddress || typeof returnFromAddress !== 'object' || !returnFromAddress.line1 || !returnFromAddress.city || !returnFromAddress.postal_code || !returnFromAddress.country) {
       return NextResponse.json({ error: 'Valid customer return address (Return From) is required' }, { status: 400 });
    }
    
    // Validate returnToAddress (warehouse)
    if (!returnToAddress || typeof returnToAddress !== 'object' || !returnToAddress.line1 || !returnToAddress.city || !returnToAddress.postal_code || !returnToAddress.country) {
       return NextResponse.json({ error: 'Valid warehouse return address (Return To) is required' }, { status: 400 });
    }

    // Fetch order details from Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*') // Select necessary fields for Sendcloud payload
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Create return label using SendCloud - pass both addresses
    const returnLabel = await createReturnLabel(order, returnFromAddress, returnToAddress);

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