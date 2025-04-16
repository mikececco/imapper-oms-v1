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

    const { orderId } = await request.json();
    
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
    if (!order.order_pack || order.order_pack.trim() === '') {
      return NextResponse.json({ error: 'Order pack is required before creating a shipping label' }, { status: 400 });
    }
    
    // Create a parcel in SendCloud
    const parcel = await createSendCloudParcel(order);
    
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
 * @returns {Promise<Object>} - The created parcel object
 */
async function createSendCloudParcel(order) {
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
    const weight = order.weight ? order.weight.toString() : '1.000';
    
    // Get shipping method or use default
    const shippingMethod = order.shipping_method || 'standard';
    
    // Prepare the parcel data
    const parcelData = {
      parcel: {
        name: (order.name || 'Customer').slice(0, 35), // Truncate name to 35 characters
        company_name: '',
        address: order.shipping_address_line1,
        house_number: order.shipping_address_house_number,
        address_2: order.shipping_address_line2 || '',
        city: order.shipping_address_city,
        postal_code: order.shipping_address_postal_code,
        country: order.shipping_address_country,
        email: order.email || '',
        telephone: order.phone || '',
        order_number: order.order_pack_label || order.order_pack, // Use the stored label, fallback to order_pack if not available
        weight: weight,
        request_label: false,
        apply_shipping_rules: false,
      }
    };
    
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