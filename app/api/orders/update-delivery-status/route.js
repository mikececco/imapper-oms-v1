import { NextResponse } from 'next/server';
import { batchUpdateDeliveryStatus, updateOrderDeliveryStatus } from '../../../utils/sendcloud';

/**
 * Update delivery status for a specific order or batch of orders
 * 
 * POST /api/orders/update-delivery-status
 * POST /api/orders/update-delivery-status?orderId=123
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    // If orderId is provided, update just that order
    if (orderId) {
      const result = await updateOrderDeliveryStatus(orderId);
      
      if (!result.success) {
        return NextResponse.json({ 
          success: false, 
          error: result.error 
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: true,
        order: result.order,
        deliveryStatus: result.deliveryStatus
      });
    }
    
    // Otherwise, batch update orders
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 50;
    
    const result = await batchUpdateDeliveryStatus(limit);
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating delivery status:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Get delivery status for a specific order
 * 
 * GET /api/orders/update-delivery-status?orderId=123
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order ID is required' 
      }, { status: 400 });
    }
    
    const result = await updateOrderDeliveryStatus(orderId);
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      order: result.order,
      deliveryStatus: result.deliveryStatus
    });
  } catch (error) {
    console.error('Error getting delivery status:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 