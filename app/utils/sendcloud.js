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
    console.log(`[fetchDeliveryStatus] SendCloud Raw Response for ${trackingNumber}:`, JSON.stringify(data, null, 2)); // Log raw response
    
    // Extract latest status from the statuses array
    let latestStatus = null;
    if (data.statuses && Array.isArray(data.statuses) && data.statuses.length > 0) {
      const latestStatusObject = data.statuses[data.statuses.length - 1];
      latestStatus = latestStatusObject.carrier_message || latestStatusObject.parent_status || null; // Use carrier_message, fallback to parent_status
    }
    console.log(`[fetchDeliveryStatus] Determined latest status for ${trackingNumber}:`, latestStatus);

    return {
      status: latestStatus, // Use the extracted latest status
      lastUpdate: data.last_update || null, // Keep this if needed
      carrier: data.carrier || null,
      destination: data.destination || null,
      expectedDeliveryDate: data.expected_delivery_date || null, // Add expected date
      statusesArray: data.statuses || [], // Add full statuses array
      rawData: data
    };
  } catch (error) {
    console.error('Error fetching delivery status from SendCloud:', error);
    return { status: null, error: error.message };
  }
}

/**
 * Update order delivery status from SendCloud
 * @param {Object} order - The complete order object (including tracking_link, shipping_id, etc.)
 * @returns {Promise<Object>} - Result of the update operation
 */
export async function updateOrderDeliveryStatus(order) {
  const orderId = order.id; // Get ID from the passed object
  console.log(`[updateOrderDeliveryStatus] Received order object for ID ${orderId}:`, JSON.stringify(order, null, 2)); // Log the full input order object
  console.log(`[updateOrderDeliveryStatus] Processing order: ${orderId}`); // Log start

  try {
    if (!order) {
      console.warn(`[updateOrderDeliveryStatus] Invalid order object received.`); // Log invalid object
      return { success: false, error: 'Invalid order object provided' };
    }

    // Skip check if manual_instruction is 'NO ACTION REQUIRED'
    if (order.manual_instruction === 'NO ACTION REQUIRED') {
      console.log(`[updateOrderDeliveryStatus] Order ${orderId} skipped: Manual instruction is NO ACTION REQUIRED.`);
      // Optionally update last_delivery_status_check here if desired, even when skipped
      // await supabase.from('orders').update({ last_delivery_status_check: new Date().toISOString() }).eq('id', orderId);
      return { success: true, message: 'Status check skipped: Manual instruction is NO ACTION REQUIRED' };
    }

    let fetchedStatus = null;
    let fetchMethod = null; // Track how status was fetched ('tracking_number' or 'shipping_id')
    let statusPayload = null; // Holds data fetched via fetchDeliveryStatus (includes history/date)
    let trackingApiError = null; // Store error from fetchDeliveryStatus if it occurs

    // --- Attempt 1: Fetch using tracking_link (Prioritized) or tracking_number (Secondary) ---
    let trackingNumber = null;

    // Try tracking_link first
    if (order.tracking_link) {
      console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Attempting extraction from tracking_link first.`);
      trackingNumber = extractTrackingNumber(order.tracking_link);
      if (trackingNumber) {
        console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Extracted trackingNumber from link:`, trackingNumber);
      } else {
        console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Failed to extract trackingNumber from link. Will check tracking_number field next.`);
      }
    } else {
      console.log(`[updateOrderDeliveryStatus] Order ${orderId}: No tracking_link found. Will check tracking_number field.`);
    }

    // If link didn't yield a number, try the tracking_number field directly
    if (!trackingNumber && order.tracking_number) {
      console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Using tracking_number field directly:`, order.tracking_number);
      trackingNumber = order.tracking_number;
    }

    console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Final trackingNumber determined for fetch attempt:`, trackingNumber);

    // Now proceed with fetch attempt if we have a trackingNumber
    if (trackingNumber) {
      console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Attempting fetchDeliveryStatus with tracking_number: ${trackingNumber}`);
      try {
        const result = await fetchDeliveryStatus(trackingNumber);
        // --- DETAILED LOGGING ---
        console.log(`[updateOrderDeliveryStatus] fetchDeliveryStatus FULL result for ${trackingNumber}:`, JSON.stringify(result, null, 2));
        // --- END LOGGING ---

        if (result.status) { // Successfully got status
          fetchedStatus = result.status;
          fetchMethod = 'tracking_number';
          // Store the full payload ONLY if fetched via tracking number
          statusPayload = {
            status: fetchedStatus,
            last_delivery_status_check: new Date().toISOString(), // Track check time here too
            expected_delivery_date: result.expectedDeliveryDate,
            sendcloud_tracking_history: result.statusesArray
          };
          console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Fetched status via tracking_number: ${fetchedStatus}. History/Date obtained.`);
        } else {
          // fetchDeliveryStatus returned successfully but didn't contain a status
          trackingApiError = `Failed fetchDeliveryStatus (no status in response): ${result.error || 'Unknown error'}`;
          console.error(`[updateOrderDeliveryStatus] ${trackingApiError} for tracking number ${trackingNumber} (Order ${orderId})`);
        }
      } catch (error) {
        // Exception during fetchDeliveryStatus call
        trackingApiError = `Exception during fetchDeliveryStatus: ${error.message}`;
        console.error(`[updateOrderDeliveryStatus] ${trackingApiError} for tracking ${trackingNumber} (Order ${orderId})`);
      }
    } else {
      console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Could not determine tracking number from link or field. Will attempt shipping_id fallback if available.`);
      trackingApiError = 'No tracking number available from link or field'; // Set error for context if fallback also fails
    }

    // --- Attempt 2: Fetch using shipping_id (Fallback) ---
    // Only attempt if tracking number failed AND shipping_id exists
    if (!fetchedStatus && order.shipping_id) {
      console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Tracking number failed or unavailable. Attempting fallback fetchShippingDetails with shipping_id: ${order.shipping_id}`);
      try {
        const shippingDetails = await fetchShippingDetails(order.shipping_id);
        if (shippingDetails.success && shippingDetails.parcel && shippingDetails.parcel.status?.message) {
          fetchedStatus = shippingDetails.parcel.status.message;
          fetchMethod = 'shipping_id';
          console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Fetched status via shipping_id (fallback): ${fetchedStatus}. History/Date NOT available via this method.`);
          // IMPORTANT: Do NOT set statusPayload here
        } else {
          // fetchShippingDetails failed or didn't return a status
          const shippingDetailsError = `Fallback fetchShippingDetails failed: ${shippingDetails.error || 'No status message in parcel data'}`;
          console.error(`[updateOrderDeliveryStatus] ${shippingDetailsError} for shipping ID ${order.shipping_id} (Order ${orderId})`);
          // Combine errors if tracking also failed
          if (trackingApiError) {
            console.error(`[updateOrderDeliveryStatus] Both tracking number and shipping ID fetches failed for order ${orderId}. Tracking Error: ${trackingApiError}`);
          }
        }
      } catch (error) {
        const shippingDetailsError = `Exception during fallback fetchShippingDetails: ${error.message}`;
        console.error(`[updateOrderDeliveryStatus] ${shippingDetailsError} for ID ${order.shipping_id} (Order ${orderId})`);
        if (trackingApiError) {
          console.error(`[updateOrderDeliveryStatus] Both tracking number and shipping ID fetches failed for order ${orderId}. Tracking Error: ${trackingApiError}`);
        }
      }
    } else if (!fetchedStatus) {
      // This case means tracking number failed/unavailable AND no shipping_id was present
      console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Tracking number failed/unavailable, and no shipping_id provided for fallback.`);
    }

    // --- Update Database ---
    if (fetchedStatus) { // We managed to get a status from EITHER method
      let finalUpdatePayload = {
        last_delivery_status_check: new Date().toISOString()
      };

      // Add status if it changed
      if (fetchedStatus !== order.status) {
        console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Status changed (${order.status || 'null'} -> ${fetchedStatus}). Including status in update.`);
        finalUpdatePayload.status = fetchedStatus;
      } else {
        console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Status unchanged (${fetchedStatus}).`);
      }

      // Add history and date ONLY if fetched via tracking number (statusPayload exists)
      let message;
      let returnDataFields = {}; // Fields specific to the return object

      if (fetchMethod === 'tracking_number' && statusPayload) {
        finalUpdatePayload.expected_delivery_date = statusPayload.expected_delivery_date;
        finalUpdatePayload.sendcloud_tracking_history = statusPayload.sendcloud_tracking_history;
        message = finalUpdatePayload.status ? 'Status, history, and date updated' : 'History and date updated (status unchanged)';
        console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Including history and expected date in update (fetched via ${fetchMethod}).`);
        // Set fields for return object
        returnDataFields = {
           expected_delivery_date: finalUpdatePayload.expected_delivery_date,
           sendcloud_tracking_history: finalUpdatePayload.sendcloud_tracking_history
        };
      } else { // Fetched via shipping_id or status didn't change
         message = finalUpdatePayload.status ? `Status updated (via ${fetchMethod})` : `Status unchanged (fetched via ${fetchMethod})`;
         console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Updating status/check time only (fetched via ${fetchMethod}).`);
      }

      // --- DETAILED LOGGING ---
      console.log(`[updateOrderDeliveryStatus] Preparing to update DB for order ${orderId} with payload:`, JSON.stringify(finalUpdatePayload, null, 2));
      // --- END LOGGING ---

      // Perform the single update operation
      const { error: updateError } = await supabase
        .from('orders')
        .update(finalUpdatePayload)
        .eq('id', orderId);

      if (updateError) {
        console.error(`[updateOrderDeliveryStatus] Error updating DB for order ${orderId}:`, updateError.message);
        return { success: false, error: 'Failed to update order status in DB' };
      }

      console.log(`[updateOrderDeliveryStatus] Successfully updated DB for order ${orderId}. Status: ${fetchedStatus}`);

      // Construct return data (reflecting what was *actually* updated)
      const returnData = {
        id: orderId,
        status: fetchedStatus, // Always return the fetched status
        last_delivery_status_check: finalUpdatePayload.last_delivery_status_check,
        ...returnDataFields // Spread history/date only if they were updated
      };

      return {
        success: true,
        deliveryStatus: fetchedStatus,
        message: message,
        order: returnData
      };

    } else {
      // If status couldn't be fetched by EITHER method
      console.log(`[updateOrderDeliveryStatus] Order ${orderId}: Could not fetch status via tracking_number or shipping_id. Updating last checked time only.`);
      // Still update the last checked time even if fetching failed
      await supabase.from('orders').update({ last_delivery_status_check: new Date().toISOString() }).eq('id', orderId);
      // Use the specific tracking API error if available, otherwise generic message
      const finalError = trackingApiError ? `Tracking fetch failed (${trackingApiError}) and shipping_id fallback failed or unavailable.` : 'Could not fetch status from Sendcloud (No valid tracking or shipping ID)';
      return { success: false, error: finalError };
    }

  } catch (error) {
    console.error(`[updateOrderDeliveryStatus] Uncaught error processing order ${orderId}:`, error);
    return { success: false, error: `Uncaught error: ${error.message}` };
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
    
    // --- ENVIRONMENT VARIABLE CHECK --- 
    console.log(`[batchUpdateDeliveryStatus] ENV CHECK: SUPABASE_URL exists? ${!!process.env.SUPABASE_URL}`);
    console.log(`[batchUpdateDeliveryStatus] ENV CHECK: SUPABASE_SERVICE_ROLE_KEY exists? ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
    console.log(`[batchUpdateDeliveryStatus] ENV CHECK: SENDCLOUD_API_KEY exists? ${!!process.env.SENDCLOUD_API_KEY}`);
    console.log(`[batchUpdateDeliveryStatus] ENV CHECK: SENDCLOUD_API_SECRET exists? ${!!process.env.SENDCLOUD_API_SECRET}`);
    // --- END ENV CHECK --- 

    // Calculate time threshold (e.g., 12 hours ago)
    const checkThreshold = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const checkThresholdISO = checkThreshold.toISOString();
    console.log(`[batchUpdateDeliveryStatus] Check threshold: ${checkThresholdISO}`);

    // --- DEBUGGING: Pre-check potential candidates --- 
    console.log(`[batchUpdateDeliveryStatus] DEBUG: Checking potential candidates (simplified query)...`);
    const { data: potentialOrders, error: potentialError } = await supabase
      .from('orders')
      .select('id, tracking_link, status, manual_instruction, last_delivery_status_check')
      // .not('status', 'eq', 'delivered') // Temporarily removed for debug
      // .not('manual_instruction', 'in', '("NO ACTION REQUIRED", "DELIVERED")') // Temporarily removed for debug
      .limit(limit * 5); // Fetch more candidates for debugging scope

    if (potentialError) {
      console.error('[batchUpdateDeliveryStatus] DEBUG: Error fetching potential candidates:', potentialError.message);
    } else if (potentialOrders && potentialOrders.length > 0) {
      console.log(`[batchUpdateDeliveryStatus] DEBUG: Found ${potentialOrders.length} potential candidates. Analyzing exclusion reasons:`);
      potentialOrders.forEach(order => {
        const exclusionReasons = [];
        // Check each condition from the main query
        if (!order.tracking_link) {
          exclusionReasons.push('Missing tracking_link');
        }
        // Status check already done in initial query
        // Manual instruction check already done in initial query
        
        const lastCheck = order.last_delivery_status_check ? new Date(order.last_delivery_status_check) : null;
        const needsCheckBasedOnTime = !lastCheck || lastCheck < checkThreshold;
        if (!needsCheckBasedOnTime) {
          exclusionReasons.push(`Checked recently (${lastCheck?.toISOString()})`);
        }

        if (exclusionReasons.length > 0) {
          console.log(`[batchUpdateDeliveryStatus] DEBUG: Order ${order.id} EXCLUDED. Reasons: [${exclusionReasons.join(', ')}]`);
        } else {
          // If no exclusion reasons found by this logic, it *should* be eligible according to the main criteria
          console.log(`[batchUpdateDeliveryStatus] DEBUG: Order ${order.id} should be ELIGIBLE.`);
        }
      });
    } else {
      console.log('[batchUpdateDeliveryStatus] DEBUG: No potential candidates found based on initial status/instruction filters.');
    }
    console.log(`[batchUpdateDeliveryStatus] DEBUG: Pre-check finished. Proceeding with main query...`);
    // --- END DEBUGGING --- 

    // Get orders with tracking links that are not delivered 
    // AND haven't been checked recently (or ever)
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, tracking_link, status, shipping_id, tracking_number, last_delivery_status_check, manual_instruction') // Added manual_instruction back
      .not('tracking_link', 'is', null)
      // Explicitly handle NULL status or status not equal to delivered
      .or('status.is.null,status.neq.delivered')
      // Explicitly handle NULL manual_instruction or instruction not in the excluded list
      .or('manual_instruction.is.null,manual_instruction.not.in.("NO ACTION REQUIRED","DELIVERED")') 
      // Filter for orders not checked recently or never checked
      .or(`last_delivery_status_check.is.null,last_delivery_status_check.lt.${checkThresholdISO}`) 
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
      // Pass the full order object now
      const result = await updateOrderDeliveryStatus(order); 
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
export async function createReturnLabel(order, returnFromAddress, returnToAddress, parcelWeight, customParcelItems = null) {
  try {
    // DEBUG: Log what we received
    console.log('createReturnLabel - customParcelItems received:', customParcelItems);
    console.log('createReturnLabel - customParcelItems type:', typeof customParcelItems);
    console.log('createReturnLabel - customParcelItems length:', customParcelItems?.length);
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
    const fromCountryCode = returnFromAddress.country ? returnFromAddress.country.toUpperCase() : null;

    let shipWithObject = {
      shipping_product_code: "dhl_express:worldwide_import/dropoff"
    };

    if (fromCountryCode === 'CH' || fromCountryCode === 'GB') {
      shipWithObject.functionalities = {
        direct_contract_only: true,
        service_area: "international",
        incoterm: "dap"
      };
      shipWithObject.contract = 106496;
    }

    const returnPayload = {
      from_address: fromAddressPayload,
      to_address: toAddressPayload,
      weight: {
        value: parseFloat(parcelWeight) || 1.0,
        unit: "kg"
      },
      ship_with: shipWithObject,
      // parcel_items: [] // Add if required for customs or detailed returns
    };

    // --- Customs Information for International Returns ---
    const countriesRequiringCustoms = ['GB', 'CH', 'US', 'CA', 'AU', 'NO']; // Sync with create-shipping-label
    const requiresCustoms = countriesRequiringCustoms.includes(fromCountryCode);

    if (requiresCustoms) {
      console.log(`Return from ${fromCountryCode} requires customs. Adding parcel_items.`);
      let parcelItemsForReturn = [];
      const totalReturnWeight = parseFloat(parcelWeight) || 1.0;
      let totalQuantityFromLineItems = 0;

      // Use custom parcel items if provided, otherwise fall back to order line items
      if (customParcelItems && Array.isArray(customParcelItems) && customParcelItems.length > 0) {
        console.log(`Using custom parcel items provided in return form:`, customParcelItems);
        parcelItemsForReturn = customParcelItems.map(item => ({
          description: (item.description || 'Returned Product').substring(0, 50),
          quantity: parseInt(item.quantity) || 1,
          weight: parseFloat(item.weight || 0).toFixed(3),
          value: parseFloat(item.value || 0).toFixed(2),
          hs_code: item.hs_code || '90151000',
          origin_country: item.origin_country || fromCountryCode,
          sku: item.sku || ''
        }));
      } else {
        // Fall back to parsing order.line_items
        try {
          const lineItems = typeof order.line_items === 'string' 
            ? JSON.parse(order.line_items) 
            : (Array.isArray(order.line_items) ? order.line_items : []);

          if (lineItems && lineItems.length > 0) {
          totalQuantityFromLineItems = lineItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
          if (totalQuantityFromLineItems === 0) totalQuantityFromLineItems = 1; // Avoid division by zero

          parcelItemsForReturn = lineItems.map(item => ({
            description: (item.description ? item.description.substring(0, 50) : 'Returned Product'),
            quantity: item.quantity || 1,
            weight: ((totalReturnWeight / totalQuantityFromLineItems) * (item.quantity || 1)).toFixed(3),
            value: (item.amount || 0).toFixed(2),
            hs_code: item.hs_code || '90151000', // Default HS code for returns
            origin_country: fromCountryCode, // Country customer is shipping from
            sku: item.sku || ''
          }));
        } else {
          // Fallback if no line items: create a single parcel item representing the whole return
          console.warn(`Order ${order.id} for return from ${fromCountryCode} has no line_items. Creating a generic parcel item.`);
          parcelItemsForReturn.push({
            description: 'Returned Goods',
            quantity: 1,
            weight: totalReturnWeight.toFixed(3),
            value: (order.amount || 0).toFixed(2), // Use order amount if available
            hs_code: '90151000',
            origin_country: fromCountryCode,
            sku: 'RETURN-ITEM'
          });
        }
      } catch (parseError) {
        console.error(`Error parsing line_items for return (Order ${order.id}):`, parseError);
        // Fallback: create a single generic parcel item if parsing fails
        parcelItemsForReturn.push({
          description: 'Returned Goods - Parsing Error',
          quantity: 1,
          weight: totalReturnWeight.toFixed(3),
          value: (order.amount || 0).toFixed(2),
          hs_code: '90151000',
          origin_country: fromCountryCode,
          sku: 'RETURN-PARSE-ERROR'
        });
      }
      } // Close the else block for custom parcel items fallback

      if (parcelItemsForReturn.length > 0) {
        returnPayload.parcel_items = parcelItemsForReturn;
      }
      // Shipment type 4 for "Returned Goods"
      returnPayload.customs_shipment_type = 4; 
      // Use order ID or a generic return ID for customs invoice number
      returnPayload.customs_invoice_nr = `RETURN-${order.id}`;
      // EORI might be needed from the 'to_address' (your business) for import
      // This depends on SendCloud requirements for returns. Assuming to_address might have an EORI.
      if (returnToAddress.eori) {
        returnPayload.eori = returnToAddress.eori;
      } else {
        console.warn(`EORI number for the recipient (warehouse at ${returnToAddress.country}) might be required for international returns from ${fromCountryCode}. Consider adding EORI to warehouse address details.`);
      }
    }

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

    // --- Fetch Label URL Immediately ---
    let labelUrl = null;
    try {
      // Use the existing fetchShippingDetails function
      const shippingDetails = await fetchShippingDetails(data.parcel_id);
      if (shippingDetails.success && shippingDetails.labelUrl) {
        labelUrl = shippingDetails.labelUrl;
        console.log(`Successfully fetched return label URL: ${labelUrl}`);
      } else {
        // Log a warning if fetching the label failed, but don't block the process
        console.warn(`Could not fetch label URL immediately after creating return. Parcel ID: ${data.parcel_id}. Reason: ${shippingDetails.error || 'Unknown error during fetch'}`);
      }
    } catch (fetchError) {
      // Log an error if the fetch itself throws an exception
      console.error(`Error fetching label URL after return creation (Parcel ID: ${data.parcel_id}):`, fetchError);
      // Continue without the label URL, but log the error
    }

    // Return the IDs and the fetched label URL (which might be null)
    return {
      return_id: data.return_id,
      parcel_id: data.parcel_id,
      labelUrl: labelUrl // Include the potentially null label URL
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