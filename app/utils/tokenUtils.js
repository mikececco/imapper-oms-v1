import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a Version 4 UUID.
 * @returns {string} A new UUID.
 */
export function generateUUID() {
  return uuidv4();
}

// Example of how you might use this with Supabase to update an order:
/*
import { createClient } from '@supabase/supabase-js';
import { generateUUID } from './tokenUtils'; // Assuming this file is in the same directory or adjust path

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function generateAndStoreReturnToken(orderId) {
  const token = generateUUID();
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ self_service_return_token: token })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order with return token:', error);
      throw error;
    }
    console.log('Successfully generated and stored return token for order:', orderId, 'Token:', token);
    return { order: data, token };
  } catch (error) {
    // Handle or rethrow error
    return { error };
  }
}
*/ 