import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// These environment variables are set in next.config.js
const supabaseUrl = process.env.NEXT_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to fetch orders
export async function fetchOrders() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('Exception fetching orders:', e);
    return [];
  }
}

// Helper function to fetch order statistics
export async function fetchOrderStats() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('status');
  
  if (error) {
    console.error('Error fetching order statistics:', error);
    return {
      total: 0,
      pending: 0,
      shipped: 0,
      delivered: 0
    };
  }
  
  const total = orders?.length || 0;
  const pending = orders?.filter(order => order.status === 'pending').length || 0;
  const shipped = orders?.filter(order => order.status === 'shipped').length || 0;
  const delivered = orders?.filter(order => order.status === 'delivered').length || 0;
  
  return {
    total,
    pending,
    shipped,
    delivered
  };
}

// Helper function to fetch recent activity
export async function fetchRecentActivity() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
  
  return data?.map(order => {
    let activity = '';
    let time = new Date(order.updated_at || order.created_at);
    
    if (order.status === 'pending') {
      activity = `New order created: ${order.id}`;
    } else if (order.status === 'shipped') {
      activity = `Order ${order.id} marked as shipped`;
    } else if (order.status === 'delivered') {
      activity = `Order ${order.id} marked as delivered`;
    }
    
    return {
      id: order.id,
      activity,
      time
    };
  }) || [];
}

// Helper function to update order status
export async function updateOrderStatus(orderId, status) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select();
    
    if (error) {
      console.error('Error updating order status:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (e) {
    console.error('Exception updating order status:', e);
    return { success: false, error: e };
  }
}

// Helper function to update payment status
export async function updatePaymentStatus(orderId, isPaid) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ is_paid: isPaid, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select();
    
    if (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (e) {
    console.error('Exception updating payment status:', e);
    return { success: false, error: e };
  }
}

// Helper function to update shipping status
export async function updateShippingStatus(orderId, okToShip) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ ok_to_ship: okToShip, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select();
    
    if (error) {
      console.error('Error updating shipping status:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (e) {
    console.error('Exception updating shipping status:', e);
    return { success: false, error: e };
  }
}

// Helper function to search orders
export async function searchOrders(query) {
  if (!query || query.trim() === '') {
    return fetchOrders();
  }
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`id.ilike.%${query}%,customer_name.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error searching orders:', error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('Exception searching orders:', e);
    return [];
  }
}

// Helper function to create an order from a Stripe event
export async function createOrderFromStripeEvent(stripeEvent) {
  try {
    // Generate a unique ID for the order
    const orderId = `ord_${crypto.randomBytes(6).toString('hex')}`;
    
    // Extract customer information from the event
    const eventData = stripeEvent.data.object;
    let customerName = 'Unknown Customer';
    let customerEmail = '';
    let customerPhone = '';
    let shippingAddress = '';
    let orderPack = '';
    let orderNotes = '';
    
    // Handle different event types
    if (stripeEvent.type === 'checkout.session.completed') {
      // Extract data from checkout session
      const session = eventData;
      customerName = session.customer_details?.name || 'Unknown Customer';
      customerEmail = session.customer_details?.email || '';
      
      // Get shipping details if available
      if (session.shipping) {
        customerPhone = session.shipping.phone || '';
        const shipping = session.shipping.address;
        shippingAddress = [
          shipping.line1,
          shipping.line2,
          shipping.city,
          shipping.state,
          shipping.postal_code,
          shipping.country
        ].filter(Boolean).join(', ');
      }
      
      // Get metadata if available
      if (session.metadata) {
        orderPack = session.metadata.package || 'Standard Pack';
        orderNotes = session.metadata.notes || '';
      }
    } else if (stripeEvent.type === 'payment_intent.succeeded') {
      // Extract data from payment intent
      const paymentIntent = eventData;
      
      // Get customer details from payment intent
      if (paymentIntent.customer) {
        // We would need to fetch customer details from Stripe API
        // For now, use available data
        customerEmail = paymentIntent.receipt_email || '';
      }
      
      // Get shipping details if available
      if (paymentIntent.shipping) {
        customerName = paymentIntent.shipping.name || 'Unknown Customer';
        customerPhone = paymentIntent.shipping.phone || '';
        const shipping = paymentIntent.shipping.address;
        shippingAddress = [
          shipping.line1,
          shipping.line2,
          shipping.city,
          shipping.state,
          shipping.postal_code,
          shipping.country
        ].filter(Boolean).join(', ');
      }
      
      // Get metadata if available
      if (paymentIntent.metadata) {
        orderPack = paymentIntent.metadata.package || 'Standard Pack';
        orderNotes = paymentIntent.metadata.notes || '';
      }
    } else if (stripeEvent.type === 'customer.created') {
      // Extract data from customer object
      const customer = eventData;
      customerName = customer.name || 'New Customer';
      customerEmail = customer.email || '';
      customerPhone = customer.phone || '';
      
      // Get metadata if available
      if (customer.metadata) {
        orderPack = customer.metadata.package || 'Basic Pack';
        orderNotes = customer.metadata.notes || `Customer created via Stripe: ${customer.id}`;
      } else {
        orderPack = '(created by Stripe CLI)';
        orderNotes = `Stripe Customer: ${customer.id}`;
      }
    }
    
    console.log(`Creating order from ${stripeEvent.type} event:`, {
      id: orderId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
      order_pack: orderPack,
      order_notes: orderNotes
    });
    
    // Create the order in Supabase
    const { data, error } = await supabase.from('orders').insert({
      id: orderId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
      order_pack: orderPack || 'Standard Pack', // Default value
      order_notes: orderNotes,
      status: 'pending',
      is_paid: stripeEvent.type === 'payment_intent.succeeded', // Only mark as paid for payment_intent.succeeded
      ok_to_ship: false
    }).select();
    
    if (error) {
      console.error('Error creating order from Stripe event:', error);
      return { success: false, error };
    }
    
    return { success: true, data, orderId };
  } catch (e) {
    console.error('Exception creating order from Stripe event:', e);
    return { success: false, error: e };
  }
} 