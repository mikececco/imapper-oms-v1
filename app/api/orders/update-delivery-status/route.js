import { NextResponse } from 'next/server';
import { batchUpdateDeliveryStatus, updateOrderDeliveryStatus } from '../../../utils/sendcloud';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SENDCLOUD_API_KEY, SENDCLOUD_API_SECRET } from '../../../utils/env';

// Initialize Supabase client with fallback values for build time
const supabaseUrl = SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create the client if we have the required values and we're not in a build context
const isBuildTime = process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.VERCEL_ENV;
const supabase = (!isBuildTime && supabaseUrl && supabaseAnonKey && supabaseUrl !== 'build-placeholder') 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Update delivery status for a specific order or batch of orders
 * 
 * POST /api/orders/update-delivery-status
 * POST /api/orders/update-delivery-status?orderId=123
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    // If orderId is provided, update just that order
    if (orderId) {
      const result = await updateOrderDeliveryStatus(orderId);
      
      if (!result.success) {
        return NextResponse.json({ 
          success: false, 
          error: result.error 
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: true,
        order: result.order,
        deliveryStatus: result.deliveryStatus
      });
    }
    
    // Otherwise, batch update orders
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 50;
    
    const result = await batchUpdateDeliveryStatus(limit);
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating delivery status:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Get delivery status for a specific order
 * 
 * GET /api/orders/update-delivery-status?orderId=123
 */
export async function GET(request) {
  try {
    // Check if Supabase client is initialized
    if (!supabase) {
      console.error('Supabase client not initialized. Missing URL or API key.');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Get the order ID from the query parameters
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    // Fetch the order from Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check if the order has a tracking number
    if (!order.tracking_number) {
      return NextResponse.json({ 
        message: 'Order does not have a tracking number',
        status: 'EMPTY'
      });
    }
    
    // Fetch the parcel status from SendCloud
    const status = await fetchSendCloudParcelStatus(order.tracking_number);
    
    if (!status) {
      return NextResponse.json({ 
        message: 'Failed to fetch parcel status from SendCloud',
        status: 'UNKNOWN'
      });
    }
    
    // Update the order with the delivery status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        delivery_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (updateError) {
      console.error('Error updating order with delivery status:', updateError);
      return NextResponse.json({ 
        warning: true,
        message: 'Delivery status fetched but failed to update order',
        status
      }, { status: 200 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Delivery status updated successfully',
      status
    });
    
  } catch (error) {
    console.error('Error updating delivery status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update delivery status' }, { status: 500 });
  }
}

/**
 * Fetch the parcel status from SendCloud
 * @param {string} trackingNumber - The tracking number
 * @returns {Promise<string|null>} - The parcel status or null if not found
 */
async function fetchSendCloudParcelStatus(trackingNumber) {
  try {
    // Check if SendCloud API credentials are available
    const sendCloudApiKey = SENDCLOUD_API_KEY || process.env.SENDCLOUD_API_KEY;
    const sendCloudApiSecret = SENDCLOUD_API_SECRET || process.env.SENDCLOUD_API_SECRET;
    
    if (!sendCloudApiKey || !sendCloudApiSecret) {
      throw new Error('SendCloud API credentials not available');
    }
    
    // Prepare the SendCloud API credentials
    const auth = Buffer.from(`${sendCloudApiKey}:${sendCloudApiSecret}`).toString('base64');
    
    // Fetch the parcel from SendCloud
    const response = await fetch(`https://panel.sendcloud.sc/api/v2/parcels?tracking_number=${trackingNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('SendCloud API error:', data);
      return null;
    }
    
    // Check if parcels were found
    if (!data.parcels || data.parcels.length === 0) {
      return null;
    }
    
    // Get the status of the first parcel
    const parcel = data.parcels[0];
    return parcel.status.message || 'Unknown';
    
  } catch (error) {
    console.error('Error fetching SendCloud parcel status:', error);
    return null;
  }
} 