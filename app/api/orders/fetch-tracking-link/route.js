import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchShippingDetails } from '../../../utils/sendcloud';

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ 
        error: 'Database configuration error', 
        details: 'Missing required environment variables' 
      }, { status: 500 });
    }

    
    // Initialize Supabase client with environment variables
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { searchParams } = new URL(request.url);
    const shippingId = searchParams.get('shippingId');

    if (!shippingId) {
      return NextResponse.json({ error: 'Shipping ID is required' }, { status: 400 });
    }

    // Fetch shipping details from SendCloud
    const shippingDetails = await fetchShippingDetails(shippingId);

    if (!shippingDetails.success || !shippingDetails.trackingUrl) {
      console.error('SendCloud API error:', shippingDetails.error || 'No tracking URL available');
      return NextResponse.json({ 
        error: 'Failed to fetch tracking URL from SendCloud',
        details: shippingDetails.error 
      }, { status: 404 });
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
      console.error('Database update error:', orderError);
      throw orderError;
    }

    return NextResponse.json({ 
      success: true,
      tracking_url: shippingDetails.trackingUrl 
    });

  } catch (error) {
    console.error('Error fetching tracking link:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
} 