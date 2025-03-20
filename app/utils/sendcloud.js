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
    
    let deliveryInfo;
    
    // If we have a shipping_id, use it to fetch shipping details
    if (order.shipping_id) {
      console.log(`Using shipping_id ${order.shipping_id} to fetch delivery status`);
      const shippingDetails = await fetchShippingDetails(order.shipping_id);
      
      if (shippingDetails.success) {
        deliveryInfo = {
          status: shippingDetails.status,
          lastUpdate: new Date().toISOString(),
          carrier: shippingDetails.carrier,
          destination: order.shipping_address_country,
          rawData: shippingDetails.parcel
        };
      } else {
        console.warn(`Failed to fetch shipping details using shipping_id: ${shippingDetails.error}`);
        
        // If the error is 404, the shipping ID is invalid and should be removed
        if (shippingDetails.error.includes('404')) {
          console.log(`Removing invalid shipping_id ${order.shipping_id} from order ${orderId}`);
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              shipping_id: null,
              last_delivery_status_check: new Date().toISOString()
            })
            .eq('id', orderId);
          
          if (updateError) {
            console.error('Error removing invalid shipping_id:', updateError);
          }
        }
        
        // Fall back to using tracking number if shipping_id fails
      }
    }
    
    // If we don't have shipping details yet and have a tracking link, use it
    if (!deliveryInfo && order.tracking_link && order.tracking_link !== 'Empty label') {
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
      deliveryInfo = await fetchDeliveryStatus(trackingNumber);
    }
    
    if (!deliveryInfo || deliveryInfo.error) {
      return { 
        success: false, 
        error: deliveryInfo?.error || 'No delivery information available',
        order
      };
    }
    
    // Update the order with delivery status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: deliveryInfo.status,
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
    // and are not already marked as delivered
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, tracking_link, status')
      .not('tracking_link', 'is', null)
      .not('tracking_link', 'eq', 'Empty label')
      .not('status', 'eq', 'delivered')
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

/**
 * Fetch shipping details from SendCloud API by parcel ID
 * @param {string} shippingId - The SendCloud parcel ID
 * @returns {Promise<Object>} - The shipping details
 */
export async function fetchShippingDetails(shippingId) {
  if (!shippingId) {
    return { success: false, error: 'No shipping ID provided' };
  }

  try {
    // Basic auth for SendCloud API
    const auth = Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString('base64');
    
    const response = await fetch(`https://panel.sendcloud.sc/api/v2/parcels/${shippingId}`, {
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
    
    if (!data.parcel) {
      return { success: false, error: 'No parcel found with this ID' };
    }
    
    return {
      success: true,
      parcel: data.parcel,
      status: data.parcel.status?.message || null,
      trackingNumber: data.parcel.tracking_number || null,
      trackingUrl: data.parcel.tracking_url || null,
      carrier: data.parcel.carrier?.code || null,
      labelUrl: data.parcel.label?.normal_printer || null
    };
  } catch (error) {
    console.error('Error fetching shipping details from SendCloud:', error);
    return { success: false, error: error.message };
  }
}

// Utility function for base64 encoding that works in Node.js
function base64Encode(str) {
  return Buffer.from(str).toString('base64');
}

export async function fetchSendCloudParcelTrackingUrl(parcelId) {
  try {
    const credentials = `${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(credentials);
    const base64Credentials = btoa(String.fromCharCode(...new Uint8Array(data)));

    const response = await fetch(`https://panel.sendcloud.sc/api/v2/parcels/${parcelId}`, {
      headers: {
        'Authorization': `Basic ${base64Credentials}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch parcel from SendCloud');
    }

    const responseData = await response.json();
    
    if (responseData.parcel && responseData.parcel.tracking_url) {
      return responseData.parcel.tracking_url;
    }

    return null;
  } catch (error) {
    console.error('Error fetching SendCloud parcel tracking URL:', error);
    return null;
  }
}

export default {
  extractTrackingNumber,
  fetchDeliveryStatus,
  updateOrderDeliveryStatus,
  batchUpdateDeliveryStatus,
  fetchShippingDetails,
  fetchSendCloudParcelTrackingUrl
}; 