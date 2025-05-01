import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ORDER_PACK_OPTIONS } from '../../../utils/constants';

// Initialize Supabase client with better error handling
let supabase;

try {
  // Log environment variables (without sensitive values) for debugging
  console.log('Environment check:', {
    hasSupabaseUrl: !!process.env.NEXT_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV
  });

  const supabaseUrl = process.env.NEXT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlLength: supabaseUrl?.length,
      keyLength: supabaseAnonKey?.length
    });
    throw new Error('Missing Supabase environment variables');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Don't throw here, let the POST handler deal with it
}

export async function POST(request) {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return NextResponse.json({ 
        error: 'Database connection not available',
        details: 'Failed to initialize Supabase client'
      }, { status: 500 });
    }

    const { orderId, shippingMethodId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    if (!shippingMethodId) {
        return NextResponse.json({ error: 'Shipping Method ID is required when requesting label directly' }, { status: 400 });
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
    
    // Check if the order has all required shipping address information
    if (!order.shipping_address_line1 || !order.shipping_address_house_number || !order.shipping_address_city || 
        !order.shipping_address_postal_code || !order.shipping_address_country || !order.phone || 
        !order.email || !order.name || !order.order_pack_list_id) {
      const missingFields = [];
      if (!order.shipping_address_line1) missingFields.push('address line 1');
      if (!order.shipping_address_house_number) missingFields.push('house number');
      if (!order.shipping_address_city) missingFields.push('city');
      if (!order.shipping_address_postal_code) missingFields.push('postal code');
      if (!order.shipping_address_country) missingFields.push('country code');
      if (!order.phone) missingFields.push('phone number');
      if (!order.email) missingFields.push('email');
      if (!order.name) missingFields.push('name');
      if (!order.order_pack_list_id) missingFields.push('order pack');

      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }
    
    // Check if the order pack is filled
    if (!order.order_pack_list_id || order.order_pack_list_id.trim() === '') {
      return NextResponse.json({ error: 'Order pack is required before creating a shipping label' }, { status: 400 });
    }
    
    // Fetch the order pack details using the ID from the order
    const { data: orderPackData, error: packError } = await supabase
      .from('order_pack_lists')
      .select('value') // Select the 'value' column
      .eq('id', order.order_pack_list_id) // Match the ID from the order
      .single();
  
    if (packError || !orderPackData) {
      console.error('Error fetching order pack details:', packError);
      return NextResponse.json({ error: 'Failed to fetch order pack details for the specified ID' }, { status: 400 });
    }
  
    // Extract the value
    const orderPackValue = orderPackData.value;
  
    // Check if the value is empty/valid
    if (!orderPackValue || orderPackValue.trim() === '') {
      return NextResponse.json({ error: 'Selected order pack has an empty value, cannot create label' }, { status: 400 });
    }
    
    // Create a parcel in SendCloud, passing the explicit shippingMethodId
    const parcel = await createSendCloudParcel(order, orderPackValue, shippingMethodId);
    
    if (!parcel || !parcel.id) {
      return NextResponse.json({ error: 'Failed to create parcel in SendCloud' }, { status: 500 });
    }
    
    // Safely extract properties from the parcel object with fallbacks
    const parcelId = parcel?.id || '';
    const trackingNumber = parcel?.tracking_number || '';
    const trackingUrl = parcel?.tracking_url || '';
    const labelUrl = parcel?.label?.normal_printer || parcel?.label?.link || '';
    
    // Update the order with the tracking information
    let updateError;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Get current timestamp for last_delivery_status_check
    const currentTimestamp = new Date().toISOString();
    
    // Try updating the order, with retries if it fails
    while (retryCount < maxRetries) {
      const { error } = await supabase
        .from('orders')
        .update({
          shipping_id: parcelId.toString(),
          tracking_number: trackingNumber,
          tracking_link: trackingUrl,
          label_url: labelUrl,
          status: 'Ready to send',
          last_delivery_status_check: currentTimestamp,
          updated_at: currentTimestamp,
          became_to_ship_at: currentTimestamp,
          sendcloud_data: parcel // Store the full parcel data in the sendcloud_data column
        })
        .eq('id', orderId);
      
      if (!error) {
        // Update successful, break out of the retry loop
        updateError = null;
        break;
      }
      
      // Update failed, increment retry count and try again
      updateError = error;
      retryCount++;
      
      // Wait a bit before retrying (exponential backoff)
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
      }
    }
    
    if (updateError) {
      console.error(`Error updating order with tracking info after ${maxRetries} attempts:`, updateError);
      // Log the parcel object for debugging
      console.log('Parcel object:', JSON.stringify(parcel, null, 2));
      
      return NextResponse.json({ 
        warning: true,
        message: 'Shipping label created but failed to update order in database',
        error: updateError.message,
        parcel: {
          id: parcel?.id || '',
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          label: {
            normal_printer: labelUrl
          }
        },
        shipping_id: parcelId.toString(),
        tracking_number: trackingNumber,
        tracking_link: trackingUrl,
        label_url: labelUrl
      }, { status: 200 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Shipping label created successfully',
      shipping_id: parcelId.toString(),
      tracking_number: trackingNumber,
      tracking_link: trackingUrl,
      label_url: labelUrl
    });
    
  } catch (error) {
    console.error('Error creating shipping label:', error);
    return NextResponse.json({ error: error.message || 'Failed to create shipping label' }, { status: 500 });
  }
}

/**
 * Create a parcel in SendCloud
 * @param {Object} order - The order object
 * @param {string} orderPackValue - The value of the order pack from order_pack_lists
 * @param {number} shippingMethodId - The explicit shipping method ID selected by the user
 * @returns {Promise<Object>} - The created parcel object
 */
async function createSendCloudParcel(order, orderPackValue, shippingMethodId) {
  try {
    // Check if SendCloud API credentials are available
    const sendCloudApiKey = process.env.SENDCLOUD_API_KEY;
    const sendCloudApiSecret = process.env.SENDCLOUD_API_SECRET;
    
    if (!sendCloudApiKey || !sendCloudApiSecret) {
      throw new Error('SendCloud API credentials not available');
    }
    
    // Prepare the SendCloud API credentials
    const auth = Buffer.from(`${sendCloudApiKey}:${sendCloudApiSecret}`).toString('base64');
    
    // Ensure weight is in the correct format (string with 3 decimal places)
    const totalWeight = order.weight ? parseFloat(order.weight) : 1.0;
    const weightString = totalWeight.toFixed(3);

    // --- Customs Information Logic --- 
    const destinationCountry = order.shipping_address_country?.toUpperCase();
    // Define countries requiring customs declarations (expand as needed)
    const countriesRequiringCustoms = ['GB', 'CH', 'US', 'CA', 'AU', 'NO']; // Example list
    const requiresCustoms = countriesRequiringCustoms.includes(destinationCountry);

    let parcelItems = [];
    let totalQuantity = 0;

    if (requiresCustoms) {
      try {
        const lineItems = typeof order.line_items === 'string' 
          ? JSON.parse(order.line_items) 
          : (Array.isArray(order.line_items) ? order.line_items : []);

        if (!lineItems || lineItems.length === 0) {
          // If no line items, potentially create a default item or throw error
          // For now, let's log a warning and continue without items, 
          // which might still cause an error but highlights the missing data.
          console.warn(`Order ${order.id} requires customs but has no line items.`);
          // Throwing an error might be safer:
          // throw new Error('Customs requires parcel items, but order line items are missing or invalid.');
        } else {
          // Calculate total quantity for weight distribution
          totalQuantity = lineItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
          if (totalQuantity === 0) totalQuantity = 1; // Avoid division by zero

          parcelItems = lineItems.map(item => ({
            description: item.description ? item.description.substring(0, 50) : 'Product', // Max 50 chars
            quantity: item.quantity || 1,
            // Distribute total weight proportionally (approximation)
            weight: ((totalWeight / totalQuantity) * (item.quantity || 1)).toFixed(3),
            value: (item.amount || 0).toFixed(2), // Price per item
            hs_code: item.hs_code || '90151000', // Use provided HS code as default
            origin_country: item.origin_country || 'FR', // Use origin_country if available, else default (NEEDS ATTENTION)
            sku: item.sku || '' // Add SKU if available
          }));
        }
      } catch (parseError) {
        console.error(`Error parsing line_items for order ${order.id}:`, parseError);
        throw new Error('Invalid line items format, cannot generate customs information.');
      }
    }
    // --- End Customs Information Logic ---
    
    // Prepare the base parcel data
    const parcelData = {
      parcel: {
        name: (order.name || 'Customer').slice(0, 35), // Truncate name to 35 characters
        company_name: '',
        address: order.shipping_address_line1,
        house_number: order.shipping_address_house_number,
        address_2: order.shipping_address_line2 || '',
        city: order.shipping_address_city,
        postal_code: order.shipping_address_postal_code,
        country: destinationCountry, // Use normalized country code
        email: order.email || '',
        telephone: order.phone || '',
        order_number: orderPackValue, // Use the passed orderPackValue
        weight: weightString, // Total weight as string
        request_label: true,
        apply_shipping_rules: false,
        shipment: {
          id: shippingMethodId
        }
      }
    };

    // Conditionally add customs fields
    if (requiresCustoms) {
      console.log(`Adding customs info for order ${order.id} to ${destinationCountry}`);
      parcelData.parcel.customs_shipment_type = 'commercial_goods'; // Or determine dynamically if needed
      // Use stripe_invoice_id if available, otherwise fallback to order.id
      parcelData.parcel.customs_invoice_nr = order.stripe_invoice_id || order.id || 'N/A'; 
      // Only add parcel_items if it's not empty
      if (parcelItems.length > 0) {
          parcelData.parcel.parcel_items = parcelItems;
      } else {
          // Handle cases where line items were missing/invalid - SendCloud might reject this.
          console.warn(`Proceeding without parcel_items for customs for order ${order.id}. SendCloud may reject.`);
          // Consider adding a default item if required by SendCloud
          /* parcelData.parcel.parcel_items = [{ 
              description: 'Default Item', quantity: 1, weight: weightString, value: '0.01', hs_code: null, origin_country: 'FR' 
          }]; */
      }
    }
    
    console.log('Sending parcel data to SendCloud:', JSON.stringify(parcelData, null, 2));
    
    // Send the request to SendCloud API
    const response = await fetch('https://panel.sendcloud.sc/api/v2/parcels', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(parcelData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('SendCloud API error:', data);
      throw new Error(data.error?.message || 'Failed to create parcel in SendCloud');
    }
    
    // Check if we have a valid parcel object
    if (!data.parcel) {
      console.error('SendCloud API returned no parcel:', data);
      throw new Error('SendCloud API returned no parcel');
    }
    
    // Ensure the parcel has the expected properties
    const parcel = {
      id: data.parcel.id ? data.parcel.id.toString() : '',
      tracking_number: data.parcel.tracking_number || '',
      tracking_url: data.parcel.tracking_url || '',
      label: {
        normal_printer: data.parcel.label?.normal_printer || data.parcel.label?.link || ''
      }
    };
    
    console.log('Successfully created parcel in SendCloud:', JSON.stringify(parcel, null, 2));
    
    // Return the created parcel
    return parcel;
    
  } catch (error) {
    console.error('Error creating SendCloud parcel:', error);
    throw error;
  }
} 