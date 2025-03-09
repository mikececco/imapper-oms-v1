import { NextResponse } from 'next/server';
import { fetchShippingDetails } from '../../../utils/sendcloud';

/**
 * Get shipping details for a specific shipping ID
 * 
 * GET /api/orders/shipping-details?shippingId=123456789
 */
export async function GET(request) {
  try {
    // Get the shipping ID from the query parameters
    const { searchParams } = new URL(request.url);
    const shippingId = searchParams.get('shippingId');
    
    if (!shippingId) {
      return NextResponse.json({ error: 'Shipping ID is required' }, { status: 400 });
    }
    
    // Fetch shipping details from SendCloud
    const result = await fetchShippingDetails(shippingId);
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      shipping: result
    });
  } catch (error) {
    console.error('Error fetching shipping details:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 