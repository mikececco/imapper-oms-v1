/**
 * SendCloud API integration for tracking shipments
 */

import { supabase } from './supabase';
import { SENDCLOUD_API_KEY, SENDCLOUD_API_SECRET } from './env';

/**
 * Extract tracking number from a SendCloud tracking link
 * @param {string} trackingLink - The tracking link URL
 * @returns {string|null} - The extracted tracking number or null if not found
 */
export function extractTrackingNumber(trackingLink) {
  if (!trackingLink || trackingLink === 'Empty label') {
    return null;
  }

  try {
    // Extract tracking number from URL
    // Example: https://tracking.sendcloud.sc/forward?carrier=postnl&code=3STBJK587162538&destination=NL&lang=en
    const url = new URL(trackingLink);
    const trackingNumber = url.searchParams.get('code');
    return trackingNumber;
  } catch (error) {
    console.error('Error extracting tracking number:', error);
    return null;
  }
}

/**
 * Fetch delivery status from SendCloud API
 * @param {string} trackingNumber - The tracking number
 * @returns {Promise<Object>} - The delivery status information
 */
export async function fetchDeliveryStatus(trackingNumber) {
  if (!trackingNumber) {
    return { status: null, error: 'No tracking number provided' };
  }

  try {
    // Basic auth for SendCloud API
    const auth = Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString('base64');
    
    const response = await fetch(`https://panel.sendcloud.sc/api/v2/tracking/${trackingNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SendCloud API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      status: data.status || null,
      lastUpdate: data.last_update || null,
      carrier: data.carrier || null,
      destination: data.destination || null,
      rawData: data
    };
  } catch (error) {
    console.error('Error fetching delivery status from SendCloud:', error);
    return { status: null, error: error.message };
  }
}

/**
 * Update order delivery status from SendCloud
 * @param {string} orderId - The order ID
 * @returns {Promise<Object>} - Result of the update operation
 */
export async function updateOrderDeliveryStatus(orderId) {
  try {
    // Fetch the order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return { success: false, error: fetchError };
    }
    
    // Check if order has a tracking link
    if (!order.tracking_link || order.tracking_link === 'Empty label') {
      return { 
        success: false, 
        error: 'No tracking link available',
        order
      };
    }
    
    // Extract tracking number
    const trackingNumber = extractTrackingNumber(order.tracking_link);
    if (!trackingNumber) {
      return { 
        success: false, 
        error: 'Could not extract tracking number from link',
        order
      };
    }
    
    // Fetch delivery status from SendCloud
    const deliveryInfo = await fetchDeliveryStatus(trackingNumber);
    
    if (deliveryInfo.error) {
      return { 
        success: false, 
        error: deliveryInfo.error,
        order
      };
    }
    
    // Update the order with delivery status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        delivery_status: deliveryInfo.status,
        last_delivery_status_check: new Date().toISOString(),
        sendcloud_data: deliveryInfo.rawData
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating order delivery status:', updateError);
      return { success: false, error: updateError };
    }
    
    return { 
      success: true, 
      order: updatedOrder,
      deliveryStatus: deliveryInfo.status
    };
  } catch (error) {
    console.error('Error in updateOrderDeliveryStatus:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Batch update delivery status for all orders with tracking links
 * @param {number} limit - Maximum number of orders to update (default: 50)
 * @returns {Promise<Object>} - Results of the batch update
 */
export async function batchUpdateDeliveryStatus(limit = 50) {
  try {
    // Get orders with tracking links that haven't been checked recently
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, tracking_link')
      .not('tracking_link', 'is', null)
      .not('tracking_link', 'eq', 'Empty label')
      .or('last_delivery_status_check.is.null,last_delivery_status_check.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(limit);
    
    if (fetchError) {
      console.error('Error fetching orders for batch update:', fetchError);
      return { success: false, error: fetchError };
    }
    
    if (!orders || orders.length === 0) {
      return { success: true, message: 'No orders to update', updatedCount: 0 };
    }
    
    // Update each order
    const results = [];
    for (const order of orders) {
      const result = await updateOrderDeliveryStatus(order.id);
      results.push({
        orderId: order.id,
        success: result.success,
        deliveryStatus: result.deliveryStatus || null,
        error: result.error || null
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return {
      success: true,
      totalProcessed: orders.length,
      successfulUpdates: successCount,
      failedUpdates: orders.length - successCount,
      results
    };
  } catch (error) {
    console.error('Error in batchUpdateDeliveryStatus:', error);
    return { success: false, error: error.message };
  }
}

export default {
  extractTrackingNumber,
  fetchDeliveryStatus,
  updateOrderDeliveryStatus,
  batchUpdateDeliveryStatus
}; 