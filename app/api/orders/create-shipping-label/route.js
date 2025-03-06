import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SENDCLOUD_API_KEY, SENDCLOUD_API_SECRET } from '../../../utils/env';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(request) {
  try {
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
    
    // Check if the order has the required shipping address information
    if (!order.shipping_address_line1 || !order.shipping_address_city || !order.shipping_address_postal_code || !order.shipping_address_country) {
      return NextResponse.json({ error: 'Shipping address is incomplete' }, { status: 400 });
    }
    
    // Create a parcel in SendCloud
    const parcel = await createSendCloudParcel(order);
    
    if (!parcel || !parcel.id) {
      return NextResponse.json({ error: 'Failed to create parcel in SendCloud' }, { status: 500 });
    }
    
    // Update the order with the tracking information
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        tracking_number: parcel.tracking_number || '',
        tracking_link: parcel.tracking_url || '',
        label_url: parcel.label.normal_printer || '',
        delivery_status: 'Ready to send',
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (updateError) {
      console.error('Error updating order with tracking info:', updateError);
      return NextResponse.json({ 
        warning: true,
        message: 'Shipping label created but failed to update order',
        parcel
      }, { status: 200 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Shipping label created successfully',
      tracking_number: parcel.tracking_number,
      tracking_link: parcel.tracking_url,
      label_url: parcel.label.normal_printer
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
    // Prepare the SendCloud API credentials
    const auth = Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString('base64');
    
    // Prepare the parcel data
    const parcelData = {
      parcel: {
        name: order.name || 'Customer',
        company_name: '',
        address: order.shipping_address_line1,
        address_2: order.shipping_address_line2 || '',
        city: order.shipping_address_city,
        postal_code: order.shipping_address_postal_code,
        country: order.shipping_address_country,
        email: order.email || '',
        telephone: order.phone || '',
        order_number: order.id,
        weight: '1.000', // Default weight in kg
        request_label: true,
        apply_shipping_rules: true
      }
    };
    
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
    
    // Return the created parcel
    return data.parcel;
    
  } catch (error) {
    console.error('Error creating SendCloud parcel:', error);
    throw error;
  }
} 