import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchShippingDetails } from '../../../utils/sendcloud';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create the client if we have the required values
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function GET(request) {
  try {
    // Check if Supabase client is initialized
    if (!supabase) {
      throw new Error('Database connection not available');
    }

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