"use client"

import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fetch all orders
export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
  
  return data || [];
}

// Search orders
export async function searchOrders(query) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .or(`id.ilike.%${query}%,name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,order_pack.ilike.%${query}%`)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error searching orders:', error);
    throw error;
  }
  
  return data || [];
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
    console.error('Unexpected error updating order status:', error);
    return { success: false, error };
  }
}

// Update payment status
export async function updatePaymentStatus(orderId) {
  try {
    // First, get the current payment status
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('paid')
      .eq('id', orderId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching payment status:', fetchError);
      return { success: false, error: fetchError };
    }
    
    // Toggle the payment status
    const newPaidStatus = !order.paid;
    
    const { data, error } = await supabase
      .from('orders')
      .update({ paid: newPaidStatus })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error };
    }
    
    return { success: true, isPaid: data.paid };
  } catch (error) {
    console.error('Unexpected error updating payment status:', error);
    return { success: false, error };
  }
}

// Update shipping status
export async function updateShippingStatus(orderId) {
  try {
    // First, get the current shipping status
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('ok_to_ship')
      .eq('id', orderId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching shipping status:', fetchError);
      return { success: false, error: fetchError };
    }
    
    // Toggle the shipping status
    const newShippingStatus = !order.ok_to_ship;
    
    const { data, error } = await supabase
      .from('orders')
      .update({ ok_to_ship: newShippingStatus })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating shipping status:', error);
      return { success: false, error };
    }
    
    return { success: true, okToShip: data.ok_to_ship };
  } catch (error) {
    console.error('Unexpected error updating shipping status:', error);
    return { success: false, error };
  }
} 