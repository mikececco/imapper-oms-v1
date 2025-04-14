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
  console.log(`[updateOrderDeliveryStatus] Processing order: ${orderId}`); // Log start
  try {
    // Get order details from Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, shipping_id, tracking_number, status, last_delivery_status_check')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error(`[updateOrderDeliveryStatus] Error fetching order ${orderId}:`, orderError.message); // Log fetch error
      return { success: false, error: 'Failed to fetch order details' };
    }

    if (!order) {
      console.warn(`[updateOrderDeliveryStatus] Order ${orderId} not found.`); // Log not found
      return { success: false, error: 'Order not found' };
    }

    // If no shipping ID or tracking number, nothing to check
    if (!order.shipping_id && !order.tracking_number && !order.tracking_link) { // Also check tracking_link
      console.log(`[updateOrderDeliveryStatus] Order ${orderId} has no shipping_id, tracking_number, or tracking_link.`);
      await supabase.from('orders').update({ last_delivery_status_check: new Date().toISOString() }).eq('id', orderId);
      return { success: false, error: 'No shipping ID, tracking number, or tracking link available' };
    }

    let shippingDetails = null;
    let fetchedStatus = null;
    let fetchMethod = null; // Track how status was fetched

    // --- Attempt 1: Fetch using shipping_id if available ---
    if (order.shipping_id) {
      console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Attempting fetchShippingDetails with shipping_id: ${order.shipping_id}`);
      try {
        shippingDetails = await fetchShippingDetails(order.shipping_id);
        if (shippingDetails.success && shippingDetails.parcel) {
            fetchedStatus = shippingDetails.parcel.status?.message;
            fetchMethod = 'shipping_id';
            console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Fetched status via shipping_id: ${fetchedStatus}`);
        } else {
          console.error(`[updateOrderDeliveryStatus] Failed fetchShippingDetails for shipping ID ${order.shipping_id} (Order ${orderId}): ${shippingDetails.error}`);
          if (!shippingDetails.error?.includes('404')) {
            return { success: false, error: `Failed to fetch details: ${shippingDetails.error}` };
          }
          console.warn(`[updateOrderDeliveryStatus] Shipping ID ${order.shipping_id} for order ${orderId} resulted in 404. Will try tracking number.`);
          // Don't set shippingDetails = null yet, let it fall through to tracking number check
        }
      } catch (error) {
        console.error(`[updateOrderDeliveryStatus] Exception fetching shipping details for ID ${order.shipping_id} (Order ${orderId}):`, error);
        // Fall through to try tracking number
      }
    }

    // --- Attempt 2: Fetch using tracking_number (if fetch by shipping_id failed or wasn't attempted) ---
    if (!fetchedStatus) {
      const trackingNumber = order.tracking_number || extractTrackingNumber(order.tracking_link);
      if (trackingNumber) {
          console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Attempting fetchDeliveryStatus with tracking_number: ${trackingNumber}`);
          try {
              const statusResult = await fetchDeliveryStatus(trackingNumber);
              if (statusResult.status) { // Check if status was successfully retrieved
                  fetchedStatus = statusResult.status;
                  fetchMethod = 'tracking_number';
                  console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Fetched status via tracking_number: ${fetchedStatus}`);
              } else {
                  console.error(`[updateOrderDeliveryStatus] Failed fetchDeliveryStatus for tracking number ${trackingNumber} (Order ${orderId}): ${statusResult.error || 'Status not found in response'}`);
                  // Proceed to update last checked time, but report failure
                  await supabase.from('orders').update({ last_delivery_status_check: new Date().toISOString() }).eq('id', orderId);
                  return { success: false, error: `Failed to fetch status via tracking number: ${statusResult.error || 'Status not found in response'}` };
              }
          } catch (error) {
              console.error(`[updateOrderDeliveryStatus] Exception fetching delivery status for tracking ${trackingNumber} (Order ${orderId}):`, error);
              await supabase.from('orders').update({ last_delivery_status_check: new Date().toISOString() }).eq('id', orderId);
              return { success: false, error: 'Exception fetching delivery status via tracking number' };
          }
      } else {
          console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Could not determine tracking number.`);
      }
    }
    
    // --- Update Database if status fetched and changed ---
    if (fetchedStatus) {
        if (fetchedStatus !== order.status) {
            console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Status changed (${order.status} -> ${fetchedStatus}). Updating DB...`);
            const { error: updateError } = await supabase
              .from('orders')
              .update({ status: fetchedStatus, last_delivery_status_check: new Date().toISOString() })
              .eq('id', orderId);

            if (updateError) {
              console.error(`[updateOrderDeliveryStatus] Error updating DB for order ${orderId}:`, updateError.message);
              return { success: false, error: 'Failed to update order status' };
            }
            console.log(`[updateOrderDeliveryStatus] Successfully updated order ${orderId} status to: ${fetchedStatus}`);
            return { success: true, deliveryStatus: fetchedStatus, order: {
              id: orderId,
              status: fetchedStatus,
              last_delivery_status_check: new Date().toISOString()
            } };
        } else {
            console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Status unchanged (${order.status}). Updating last checked time.`);
            await supabase.from('orders').update({ last_delivery_status_check: new Date().toISOString() }).eq('id', orderId);
            return { success: true, deliveryStatus: order.status, message: 'Status unchanged' };
        }
    } else {
        // If status couldn't be fetched by either method
        console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Could not fetch status via shipping_id or tracking_number. Updating last checked time.`);
        await supabase.from('orders').update({ last_delivery_status_check: new Date().toISOString() }).eq('id', orderId);
        return { success: false, error: 'Could not fetch status from Sendcloud' };
    }

  } catch (error) {
    console.error(`[updateOrderDeliveryStatus] Uncaught error processing order ${orderId}:`, error);
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
    console.log(`[batchUpdateDeliveryStatus] Fetching up to ${limit} orders for status check (prioritizing oldest checks)...`);
    
    // Calculate time threshold (e.g., 12 hours ago)
    const checkThreshold = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    // Get orders with tracking links that are not delivered 
    // AND haven't been checked recently (or ever)
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, tracking_link, status, shipping_id, tracking_number, last_delivery_status_check') // Select last_delivery_status_check
      .not('tracking_link', 'is', null)
      .not('status', 'eq', 'delivered')
      // Filter for orders not checked recently or never checked
      .or(`last_delivery_status_check.is.null,last_delivery_status_check.lt.${checkThreshold}`) 
      .order('last_delivery_status_check', { ascending: true, nullsFirst: true }) // Process oldest first
      .limit(limit); // Keep the limit
    
    if (fetchError) {
      console.error('[batchUpdateDeliveryStatus] Error fetching orders:', fetchError.message);
      return { success: false, error: fetchError };
    }
    
    if (!orders || orders.length === 0) {
      console.log('[batchUpdateDeliveryStatus] No eligible orders found to update.');
      return { success: true, message: 'No orders to update', updatedCount: 0 };
    }
    
    // Log the IDs of the selected orders
    const selectedOrderIds = orders.map(o => o.id);
    console.log(`[batchUpdateDeliveryStatus] Selected ${selectedOrderIds.length} orders for processing:`, selectedOrderIds);
    
    // Update each order
    const results = [];
    // Using Promise.all for potential concurrency, adjust if needed
    await Promise.all(orders.map(async (order) => {
      const result = await updateOrderDeliveryStatus(order.id);
      results.push({
        orderId: order.id,
        success: result.success,
        deliveryStatus: result.deliveryStatus || null,
        error: result.error || null
      });
    }));
    
    const successCount = results.filter(r => r.success).length;
    
    return {
      success: true,
      totalProcessed: orders.length,
      successfulUpdates: successCount,
      failedUpdates: orders.length - successCount,
      results
    };
  } catch (error) {
    console.error('[batchUpdateDeliveryStatus] Error:', error.message);
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

/**
 * Create a return label via SendCloud
 * @param {object} order 
 * @param {object} returnFromAddress - Customer's address
 * @param {object} returnToAddress - Warehouse address
 * @param {string} parcelWeight 
 * @returns {Promise<object>} 
 */
export async function createReturnLabel(order, returnFromAddress, returnToAddress, parcelWeight) {
  try {
    // --- Construct Address Objects ---
    const fromAddressPayload = {
        name: returnFromAddress.name || order.name,
        company_name: returnFromAddress.company_name || '',
        address_line_1: returnFromAddress.line1, // Use 'address' for Sendcloud line 1
        address_line_2: returnFromAddress.line2 || '',
        house_number: returnFromAddress.house_number || '',
        city: returnFromAddress.city,
        postal_code: returnFromAddress.postal_code,
        country_code: returnFromAddress.country, // Should be 2-letter ISO code
        phone_number: returnFromAddress.phone || '',
        email: returnFromAddress.email || ''
    };

    const toAddressPayload = {
        name: returnToAddress.name || 'Warehouse',
        company_name: returnToAddress.company_name || '',
        address_line_1: returnToAddress.line1, // Use 'address' for Sendcloud line 1
        address_line_2: returnToAddress.line2 || '',
        house_number: returnToAddress.house_number || '',
        city: returnToAddress.city,
        postal_code: returnToAddress.postal_code,
        country_code: returnToAddress.country, // Should be 2-letter ISO code
        phone_number: returnToAddress.phone || '',
        email: returnToAddress.email || process.env.DEFAULT_WAREHOUSE_EMAIL || ''
    };

    // --- Construct Main Payload ---
    const returnPayload = {
      from_address: fromAddressPayload, // Use the constructed object
      to_address: toAddressPayload,     // Use the constructed object
      weight: {                       // Weight object at root level
          value: parseFloat(parcelWeight) || 1.0,
          unit: "kg"
      },
      ship_with: {
        shipping_product_code: "ups:standard/return",
        functionalities: {
          carrier_insurance: false,
          labelless: false,
          direct_contract_only: true,
          first_mile: "pickup_dropoff"
        },
        contract: 28575
      },
      // parcel_items: [...] // Add if required
    };

    console.log("Sending Corrected Payload to SendCloud Returns API:", JSON.stringify(returnPayload, null, 2));

    const response = await fetch('https://panel.sendcloud.sc/api/v3/returns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SENDCLOUD_PUBLIC_KEY}:${process.env.SENDCLOUD_SECRET_KEY}`
        ).toString('base64')}`,
      },
      body: JSON.stringify(returnPayload), 
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("SendCloud API Error Response:", error);
      let errorMessage = 'Failed to create return label';
      // Improved error message extraction
      if (error && error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
         errorMessage = error.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      } else if (error && error.error && error.error.message) {
        errorMessage = `SendCloud Error: ${error.error.message}`;
      } else if (error && error.message) {
        errorMessage = `SendCloud Error: ${error.message}`;
      } else if (typeof error === 'string') {
        errorMessage = `SendCloud Error: ${error}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log("SendCloud Return Creation Response:", data);

    // Check if the essential IDs are present in the response
    if (!data || !data.return_id || !data.parcel_id) {
        console.error("SendCloud success response missing expected return_id or parcel_id:", data);
        throw new Error('SendCloud response missing IDs after creation.');
    }
    
    // Return the IDs instead of label/tracking info
    return {
      return_id: data.return_id,
      parcel_id: data.parcel_id
    };
  } catch (error) {
    console.error('SendCloud API Error creating return label:', error);
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