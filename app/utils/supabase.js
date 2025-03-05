import { createClient } from '@supabase/supabase-js';

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