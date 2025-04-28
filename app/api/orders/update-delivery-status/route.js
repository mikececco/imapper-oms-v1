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
  console.log(`--- ENTERING GET /api/orders/update-delivery-status ---`);
  try {
    // Check if Supabase client is initialized
    if (!supabase) {
      console.error('Supabase client not initialized. Missing URL or API key.');
      console.log(`--- EXITING GET /api/orders/update-delivery-status (Supabase client error) ---`);
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Get the order ID from the query parameters
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    console.log(`[update-delivery-status] Received request for orderId: ${orderId}`);
    
    if (!orderId) {
      console.log(`--- EXITING GET /api/orders/update-delivery-status (Missing orderId) ---`);
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    // Fetch the order from Supabase
    console.log(`[update-delivery-status] Fetching order ${orderId} from DB...`);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error(`[update-delivery-status] Error fetching order ${orderId}:`, orderError);
      console.log(`--- EXITING GET /api/orders/update-delivery-status (DB fetch error) ---`);
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }
    
    if (!order) {
      console.log(`--- EXITING GET /api/orders/update-delivery-status (Order not found) ---`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // --- Use updateOrderDeliveryStatus from sendcloud.js --- 
    console.log(`[update-delivery-status] Calling updateOrderDeliveryStatus utility for order ${orderId}...`);
    const result = await updateOrderDeliveryStatus(order);
    console.log(`[update-delivery-status] Result from updateOrderDeliveryStatus for order ${orderId}:`, result);

    if (!result.success) {
      console.warn(`[update-delivery-status] updateOrderDeliveryStatus failed for order ${orderId}: ${result.error}`);
      console.log(`--- EXITING GET /api/orders/update-delivery-status (updateOrderDeliveryStatus failed) ---`);
      // Return success=false but with a 200 status as it's not necessarily a server fault (e.g., Sendcloud down)
      // This matches the structure expected by the frontend's error handling.
      return NextResponse.json({ 
          success: false, 
          error: result.error || 'Failed to update status' 
      }, { status: 200 }); // Return 200 OK but indicate failure in response body
    }

    // --- Return success response --- 
    console.log(`[update-delivery-status] Successfully processed order ${orderId}. Status: ${result.deliveryStatus}`);
    console.log(`--- EXITING GET /api/orders/update-delivery-status (Success) ---`);
    return NextResponse.json({
      success: true,
      message: result.message || 'Delivery status updated successfully',
      deliveryStatus: result.deliveryStatus,
      order: result.order // Pass back the updated order data
    });
    
  } catch (error) {
    console.error('Error updating delivery status:', error);
    console.log(`--- EXITING GET /api/orders/update-delivery-status (Caught Exception) ---`);
    return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to update delivery status' 
    }, { status: 500 });
  }
}

/**
 * Fetch the parcel status from SendCloud
 * @param {string} trackingNumber - The tracking number
 * @returns {Promise<string|null>} - The parcel status or null if not found
 */
// Remove fetchSendCloudParcelStatus function as it's no longer used directly by GET
// async function fetchSendCloudParcelStatus(trackingNumber) { ... }

// --- Keep the POST handler for batch updates if still needed --- 
// /**
//  * POST handler for batch updates (Not typically called directly by client)
//  */
// export async function POST(request) { ... }

// --- Keep the GET handler for batch updates if still needed --- 
// /**
//  * GET handler for batch updates (Not typically called directly by client)
//  */
// export async function GET(request) { ... } 