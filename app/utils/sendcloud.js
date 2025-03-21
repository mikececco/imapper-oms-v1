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
      console.error('Error fetching order:', orderError);
      return { success: false, error: 'Failed to fetch order details' };
    }

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // If no shipping ID or tracking number, return early
    if (!order.shipping_id && !order.tracking_number) {
      return { success: false, error: 'No shipping ID or tracking number available' };
    }

    let shippingDetails;
    try {
      // Try to fetch shipping details using shipping ID if available
      if (order.shipping_id) {
        shippingDetails = await fetchShippingDetails(order.shipping_id);
      } else if (order.tracking_number) {
        // If no shipping ID but we have tracking number, try to fetch by tracking number
        shippingDetails = await fetchShippingDetailsByTrackingNumber(order.tracking_number);
      }
    } catch (error) {
      // If we get a 404 error, just log it and continue with tracking number if available
      if (error.message.includes('404')) {
        console.warn(`Warning: Shipping ID ${order.shipping_id} not found in SendCloud, but keeping the ID. Error:`, error);
        // Don't remove the shipping_id, just continue with tracking number if available
        if (order.tracking_number) {
          try {
            shippingDetails = await fetchShippingDetailsByTrackingNumber(order.tracking_number);
          } catch (trackingError) {
            console.error('Error fetching by tracking number:', trackingError);
            return { success: false, error: 'Failed to fetch shipping details' };
          }
        } else {
          return { success: false, error: 'No valid shipping information available' };
        }
      } else {
        console.error('Error fetching shipping details:', error);
        return { success: false, error: 'Failed to fetch shipping details' };
      }
    }

    if (!shippingDetails || !shippingDetails.parcel) {
      return { success: false, error: 'No shipping details found' };
    }

    // Update order with new delivery status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: shippingDetails.parcel.status.message,
        last_delivery_status_check: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return { success: false, error: 'Failed to update order status' };
    }

    return { 
      success: true, 
      deliveryStatus: shippingDetails.parcel.status.message,
      order: {
        id: orderId,
        status: shippingDetails.parcel.status.message,
        last_delivery_status_check: new Date().toISOString()
      }
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