import { NextResponse } from 'next/server';
import { SENDCLOUD_API_KEY, SENDCLOUD_API_SECRET } from '../../../utils/env';
import { supabase } from '../../../utils/supabase';

export async function POST(request) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }
    
    // Fetch order details from Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    
    // Check if order has required shipping information
    if (!order.name || !order.shipping_address) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order is missing required shipping information (name or address)' 
      }, { status: 400 });
    }
    
    // Parse shipping address (assuming format: street, city, postal_code, country)
    const addressParts = (order.shipping_address || '').split(',').map(part => part.trim());
    const street = addressParts[0] || '';
    const city = addressParts[1] || '';
    const postalCode = addressParts[2] || '';
    const country = addressParts[3] || 'NL'; // Default to Netherlands if not specified
    
    // Create parcel data for SendCloud API
    const parcelData = {
      parcel: {
        name: order.name,
        address: street,
        city: city,
        postal_code: postalCode,
        country: country,
        email: order.email || '',
        telephone: order.phone || '',
        order_number: order.id,
        weight: "1.000", // Default weight in kg
        request_label: true,
        shipment: {
          id: 8, // Standard shipment method ID (adjust based on your SendCloud account)
        }
      }
    };
    
    // Make request to SendCloud API
    const sendcloudUrl = 'https://panel.sendcloud.sc/api/v2/parcels';
    const auth = Buffer.from(`${SENDCLOUD_API_KEY}:${SENDCLOUD_API_SECRET}`).toString('base64');
    
    const response = await fetch(sendcloudUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(parcelData)
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('SendCloud API error:', responseData);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create shipping label',
        details: responseData
      }, { status: response.status });
    }
    
    // Extract tracking information from response
    const parcel = responseData.parcel;
    const trackingNumber = parcel.tracking_number;
    const trackingUrl = parcel.tracking_url;
    const labelUrl = parcel.label.label_printer;
    
    // Update order in Supabase with tracking information
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        tracking_link: trackingUrl,
        label_url: labelUrl,
        shipping_instruction: 'SHIPPED',
        status: 'shipped',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select();
    
    if (updateError) {
      console.error('Error updating order with tracking info:', updateError);
      return NextResponse.json({ 
        success: true, 
        warning: 'Shipping label created but failed to update order',
        parcel: parcel
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Shipping label created successfully',
      parcel: parcel,
      order: updatedOrder[0]
    });
    
  } catch (error) {
    console.error('Error creating shipping label:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
} 