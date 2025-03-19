import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchShippingDetails } from '../../../utils/sendcloud';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../../utils/env';

// Create a Supabase client for the server
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shippingId = searchParams.get('shippingId');

    if (!shippingId) {
      return NextResponse.json({ error: 'Shipping ID is required' }, { status: 400 });
    }

    // Fetch shipping details from SendCloud
    const shippingDetails = await fetchShippingDetails(shippingId);

    if (!shippingDetails.success || !shippingDetails.trackingUrl) {
      return NextResponse.json({ error: 'Failed to fetch tracking URL from SendCloud' }, { status: 404 });
    }

    // Update the order with the tracking URL
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({ 
        tracking_link: shippingDetails.trackingUrl,
        updated_at: new Date().toISOString()
      })
      .eq('shipping_id', shippingId)
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    return NextResponse.json({ tracking_url: shippingDetails.trackingUrl });

  } catch (error) {
    console.error('Error fetching tracking link:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 