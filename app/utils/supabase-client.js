"use client"

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';
import { calculateOrderInstruction } from './order-instructions';

// Check if we're in a build context
const isBuildTime = process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.VERCEL_ENV;

// Check if environment variables are set
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'build-placeholder') {
  console.warn('Supabase environment variables are missing. Using fallback values.');
}

// Create Supabase client with error handling
let supabase;
let isInitialized = false;

function initializeSupabase(url, key) {
  try {
    // Only create the client if we have valid values
    if (url && key && url !== 'build-placeholder') {
      console.log('Initializing Supabase client with URL:', url);
      
      supabase = createClient(url, key, {
        auth: { persistSession: false }
      });
      
      isInitialized = true;
      
      // Verify the client is working by testing a simple query
      const testQuery = async () => {
        try {
          const { data, error } = await supabase.from('orders').select('id').limit(1);
          if (error) {
            console.error('Supabase client test query failed:', error);
            return false;
          }
          console.log('Supabase client test query succeeded');
          return true;
        } catch (e) {
          console.error('Exception during Supabase client test:', e);
          return false;
        }
      };
      
      // If test fails, we'll recreate a dummy client
      if (typeof window !== 'undefined') {
        testQuery().then(success => {
          if (!success) {
            console.warn('Supabase client test failed, recreating dummy client');
            createDummyClient();
          } else {
            console.log('Supabase client initialized successfully');
          }
        });
      }
      
      return true;
    } else {
      console.warn('Invalid Supabase credentials, creating dummy client');
      createDummyClient();
      return false;
    }
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    createDummyClient();
    return false;
  }
}

// Try to initialize with environment variables
initializeSupabase(SUPABASE_URL, SUPABASE_ANON_KEY);

// Listen for environment variable updates
if (typeof window !== 'undefined') {
  window.addEventListener('supabase-env-ready', (event) => {
    console.log('Received supabase-env-ready event');
    const { url, key } = event.detail;
    
    // Only reinitialize if we haven't successfully initialized yet
    if (!isInitialized && url && key) {
      console.log('Reinitializing Supabase client with updated credentials');
      initializeSupabase(url, key);
    }
  });
  
  // Also check if window.__ENV__ is already available
  if (window.__ENV__ && window.__ENV__.NEXT_PUBLIC_SUPABASE_URL && window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (!isInitialized) {
      console.log('Found environment variables in window.__ENV__, initializing Supabase client');
      initializeSupabase(
        window.__ENV__.NEXT_PUBLIC_SUPABASE_URL,
        window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
    }
  }
}

// Function to create a dummy client
function createDummyClient() {
  console.warn('Creating dummy Supabase client due to initialization issues');
  supabase = {
    from: () => ({
      select: () => ({
        data: [],
        error: null,
        order: () => ({ data: [], error: null }),
        eq: () => ({ data: null, error: null }),
        or: () => ({ data: [], error: null }),
      }),
      insert: () => ({ data: null, error: new Error('Supabase client not initialized') }),
      update: () => ({ data: null, error: new Error('Supabase client not initialized') }),
      delete: () => ({ data: null, error: new Error('Supabase client not initialized') }),
    })
  };
  isInitialized = false;
}

export { supabase };

// Fetch orders
export async function fetchOrders() {
  try {
    // Check if supabase client is properly initialized
    if (!supabase || !supabase.from) {
      console.error('Supabase client not properly initialized');
      return [];
    }
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('created_via', 'standard')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching orders:', error);
    return [];
  }
}

// Search orders
export async function searchOrders(query) {
  try {
    // If query is empty, return all orders
    if (!query || query.trim() === '') {
      return await fetchOrders();
    }
    
    // Clean the query to prevent SQL injection
    const cleanQuery = query.replace(/[%_]/g, '\\$&');
    console.log(`Searching for orders with cleaned query: "${cleanQuery}"`);
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('created_via', 'standard')
      .or(
        `id.ilike.%${cleanQuery}%,` +
        `name.ilike.%${cleanQuery}%,` +
        `email.ilike.%${cleanQuery}%,` +
        `phone.ilike.%${cleanQuery}%,` +
        `shipping_address_line1.ilike.%${cleanQuery}%,` +
        `shipping_address_line2.ilike.%${cleanQuery}%,` +
        `shipping_address_city.ilike.%${cleanQuery}%,` +
        `shipping_address_postal_code.ilike.%${cleanQuery}%,` +
        `shipping_address_country.ilike.%${cleanQuery}%,` +
        `order_pack.ilike.%${cleanQuery}%,` +
        `order_notes.ilike.%${cleanQuery}%,` +
        `status.ilike.%${cleanQuery}%,` +
        `instruction.ilike.%${cleanQuery}%,` +
        `tracking_number.ilike.%${cleanQuery}%,` +
        `stripe_customer_id.ilike.%${cleanQuery}%,` +
        `stripe_invoice_id.ilike.%${cleanQuery}%`
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching orders:', error);
      return [];
    }

    console.log(`Search returned ${data.length} results`);
    return data || [];
  } catch (error) {
    console.error('Exception in searchOrders:', error);
    return [];
  }
}

// Update order status
export async function updateOrderStatus(orderId, status) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating order status:', error);
      return { success: false, error };
    }
    
    return { success: true, status: data.status };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error };
  }
}

// Update payment status
export async function updatePaymentStatus(orderId) {
  try {
    // First, get the current status
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('is_paid')
      .eq('id', orderId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching order payment status:', fetchError);
      return { success: false, error: fetchError };
    }
    
    // Toggle the status
    const newStatus = !order.is_paid;
    
    // Update the status
    const { data, error } = await supabase
      .from('orders')
      .update({ is_paid: newStatus })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error };
    }
    
    return { success: true, isPaid: data.is_paid };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error };
  }
}

// Update shipping status
export async function updateShippingStatus(orderId) {
  try {
    // First, get the current status
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('ok_to_ship')
      .eq('id', orderId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching order shipping status:', fetchError);
      return { success: false, error: fetchError };
    }
    
    // Toggle the status
    const newStatus = !order.ok_to_ship;
    
    // Update the status
    const { data, error } = await supabase
      .from('orders')
      .update({ ok_to_ship: newStatus })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating shipping status:', error);
      return { success: false, error };
    }
    
    return { success: true, okToShip: data.ok_to_ship };
  } catch (error) {
    console.error('Error updating shipping status:', error);
    return { success: false, error };
  }
}

// Filter orders
export async function filterOrders(filters) {
  try {
    let query = supabase
      .from('orders')
      .select('*')
      .eq('created_via', 'standard');
    
    // Apply paid status filter
    if (filters.paid && filters.paid !== 'all') {
      query = query.eq('paid', filters.paid === 'paid');
    }

    // Apply important filter
    if (filters.important && filters.important !== 'all') {
      query = query.eq('important', filters.important === 'important');
    }
    
    // Apply date range filter
    if (filters.startDate) {
      // Add time to make it the beginning of the day
      const startDateTime = new Date(filters.startDate);
      startDateTime.setUTCHours(0, 0, 0, 0);
      query = query.gte('created_at', startDateTime.toISOString());
    }
    
    if (filters.endDate) {
      // Add time to make it the end of the day
      const endDateTime = new Date(filters.endDate);
      endDateTime.setUTCHours(23, 59, 59, 999);
      query = query.lte('created_at', endDateTime.toISOString());
    }
    
    // Order by created_at descending
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error filtering orders:', error);
      return [];
    }

    // Calculate instruction for each order and filter by instruction if needed
    let filteredData = data || [];
    
    // Apply instruction filter after fetching data
    if (filters.instruction && filters.instruction !== 'all') {
      // Convert from kebab-case to the actual values stored in the database
      const instructionMap = {
        'action-required': 'ACTION REQUIRED',
        'to-ship': 'TO SHIP',
        'do-not-ship': 'DO NOT SHIP',
        'shipped': 'SHIPPED',
        'delivered': 'DELIVERED',
        'to-be-shipped-but-no-sticker': 'TO BE SHIPPED BUT NO STICKER',
        'no-action-required': 'NO ACTION REQUIRED',
        'paste-back-tracking-link': 'PASTE BACK TRACKING LINK'
      };
      
      const instructionValue = instructionMap[filters.instruction] || filters.instruction;
      
      // Filter orders based on calculated instruction
      filteredData = filteredData.filter(order => {
        const calculatedInstruction = calculateOrderInstruction(order);
        return calculatedInstruction === instructionValue;
      });
    }
    
    return filteredData;
  } catch (error) {
    console.error('Exception filtering orders:', error);
    return [];
  }
}

// Fetch order statistics
export async function fetchOrderStats() {
  try {
    // First, get the total count of orders
    const { count: total, error: countError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error fetching order count:', countError);
      return { total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    }
    
    // Then get counts for each status
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const stats = { total };
    
    // Get count for each status in parallel
    await Promise.all(statuses.map(async (status) => {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      
      if (error) {
        console.error(`Error fetching ${status} order count:`, error);
        stats[status] = 0;
      } else {
        stats[status] = count;
      }
    }));
    
    return stats;
  } catch (error) {
    console.error('Exception fetching order stats:', error);
    return { total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
  }
}

// Fetch recent activity
export async function fetchRecentActivity() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, name, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
    
    return data?.map(order => {
      let description = '';
      let time = new Date(order.updated_at || order.created_at);
      
      if (order.status === 'pending') {
        description = `New order created: ${order.id} for ${order.name || 'Unknown Customer'}`;
      } else if (order.status === 'shipped') {
        description = `Order ${order.id} for ${order.name || 'Unknown Customer'} marked as shipped`;
      } else if (order.status === 'delivered') {
        description = `Order ${order.id} for ${order.name || 'Unknown Customer'} marked as delivered`;
      } else {
        description = `Order ${order.id} for ${order.name || 'Unknown Customer'} updated to ${order.status}`;
      }
      
      return {
        id: order.id,
        description,
        time
      };
    }) || [];
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

// Fetch tracked orders with SendCloud status
export async function fetchTrackedOrders(limit = 10) {
  try {
    // Get orders with tracking links
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .not('tracking_link', 'is', null)
      .not('tracking_link', 'eq', 'Empty label')
      .order('last_delivery_status_check', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching tracked orders:', error);
      return [];
    }
    
    // Calculate instruction for each order and ensure customer_name is set
    const ordersWithInstructions = data.map(order => ({
      ...order,
      instruction: calculateOrderInstruction(order),
      customer_name: order.name || 'Unknown Customer'
    }));
    
    return ordersWithInstructions || [];
  } catch (error) {
    console.error('Exception fetching tracked orders:', error);
    return [];
  }
} 