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
    // Get order details from Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, shipping_id, tracking_number, status, last_delivery_status_check')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error(`Error fetching order ${orderId}:`, orderError);
      return { success: false, error: 'Failed to fetch order details' };
    }

    if (!order) {
      console.warn(`Order ${orderId} not found for status update.`);
      return { success: false, error: 'Order not found' };
    }

    // If no shipping ID or tracking number, nothing to check
    if (!order.shipping_id && !order.tracking_number) {
      // Optionally log this state or mark the order
      console.log(`Order ${orderId} has no shipping_id or tracking_number.`);
      return { success: false, error: 'No shipping ID or tracking number available' };
    }

    let shippingDetails = null;
    if (order.shipping_id) {
      try {
        shippingDetails = await fetchShippingDetails(order.shipping_id);
        if (!shippingDetails.success) {
          // Handle non-404 errors from fetchShippingDetails
          if (!shippingDetails.error?.includes('404')) {
            console.error(`Failed to fetch details for shipping ID ${order.shipping_id}: ${shippingDetails.error}`);
            return { success: false, error: `Failed to fetch details: ${shippingDetails.error}` };
          }
          // If it was a 404, log it and clear shippingDetails to prevent update based on stale ID
          console.warn(`Shipping ID ${order.shipping_id} for order ${orderId} not found in SendCloud.`);
          shippingDetails = null; // Ensure we don't proceed with invalid ID data
        }
      } catch (error) {
        // Catch unexpected errors during fetch
        console.error(`Exception fetching shipping details for ID ${order.shipping_id}:`, error);
        return { success: false, error: 'Exception fetching shipping details' };
      }
    }

    // If shippingDetails were successfully fetched (not null and success is true)
    if (shippingDetails && shippingDetails.success && shippingDetails.parcel) {
      // Update order with new delivery status
      const newStatus = shippingDetails.parcel.status?.message;
      if (newStatus && newStatus !== order.status) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: newStatus,
            last_delivery_status_check: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          console.error(`Error updating order ${orderId} status:`, updateError);
          return { success: false, error: 'Failed to update order status' };
        }
        console.log(`Updated order ${orderId} status to: ${newStatus}`);
        return { 
          success: true, 
          deliveryStatus: newStatus,
          order: {
            id: orderId,
            status: newStatus,
            last_delivery_status_check: new Date().toISOString()
          }
        };
      } else {
        // Status hasn't changed or is missing in response
        console.log(`Status for order ${orderId} hasn't changed (${order.status}) or is missing in SendCloud response.`);
        // Update last checked time even if status didn't change
        await supabase
          .from('orders')
          .update({ last_delivery_status_check: new Date().toISOString() })
          .eq('id', orderId);
        return { success: true, deliveryStatus: order.status, message: 'Status unchanged' };
      }
    } else {
      // Handle cases where shipping_id was invalid (404) or missing, and no details were fetched
      console.log(`Skipping status update for order ${orderId} as shipping details could not be fetched via shipping_id.`);
      // Optionally, you could try fetching by tracking number here if needed, using fetchDeliveryStatus
      // For now, we just mark it as checked
       await supabase
          .from('orders')
          .update({ last_delivery_status_check: new Date().toISOString() })
          .eq('id', orderId);
      return { success: false, error: 'Shipping details not found via ID' };
    }

  } catch (error) {
    console.error(`Error in updateOrderDeliveryStatus for order ${orderId}:`, error);
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
      // .not('tracking_link', 'eq', 'Empty label')
      .not('status', 'eq', 'delivered')
      // .or('last_delivery_status_check.is.null,last_delivery_status_check.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
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

export async function createReturnLabel(order) {
  try {
    const response = await fetch('https://panel.sendcloud.sc/api/v2/returns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SENDCLOUD_PUBLIC_KEY}:${process.env.SENDCLOUD_SECRET_KEY}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        parcel: {
          name: order.name,
          address: order.address,
          city: order.city,
          postal_code: order.postal_code,
          country: order.country,
          request_label: true,
          order_number: order.id.toString(),
          email: order.email,
          telephone: order.phone || '',
          weight: '1.000', // Default weight in kg
          is_return: true,
          shipment: {
            id: order.shipping_id,
            tracking_number: order.tracking_number
          }
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message || 'Failed to create return label');
    }

    const data = await response.json();
    return {
      label_url: data.parcel.label.label_printer,
      tracking_number: data.parcel.tracking_number,
      tracking_url: data.parcel.tracking_url
    };
  } catch (error) {
    console.error('SendCloud API Error:', error);
    throw error;
  }
}

export default {
  extractTrackingNumber,
  fetchDeliveryStatus,
  updateOrderDeliveryStatus,
  batchUpdateDeliveryStatus,
  fetchShippingDetails,
  fetchSendCloudParcelTrackingUrl,
  createReturnLabel
}; 