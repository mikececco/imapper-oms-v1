import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client using server-side variables
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  const orderId = params.id; // Get orderId from the dynamic route segment

  if (!orderId) {
    return NextResponse.json({ error: 'Missing order ID in request path' }, { status: 400 });
  }

  console.log(`[API] Attempting to mark order ${orderId} manual_instruction as 'delivered'`);

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
          manual_instruction: 'delivered', // Set the specific instruction
          updated_at: new Date().toISOString() 
       })
      .eq('id', orderId)
      .select('id') // Select only ID to confirm update
      .single(); // Expecting a single row update

    if (error) {
      console.error(`[API] Supabase error updating manual_instruction for order ${orderId}:`, error);
      // Check for specific Supabase errors, e.g., P0001 if using RLS and policy fails
      if (error.code === 'PGRST116') { // Example: Error code if row not found
         return NextResponse.json({ error: `Order with ID ${orderId} not found.` }, { status: 404 });
      }
      throw error; // Re-throw other errors
    }

    if (!data) {
        // This case might occur if the ID exists but update didn't happen (unlikely with .single() error handling)
        console.warn(`[API] Order ${orderId} found, but manual_instruction update returned no data.`);
         return NextResponse.json({ error: `Order with ID ${orderId} not found or update failed.` }, { status: 404 });
    }

    console.log(`[API] Successfully marked order ${orderId} manual_instruction as 'delivered'.`);
    return NextResponse.json({ success: true, message: `Order ${orderId} marked as delivered.` });

  } catch (error) {
    console.error(`[API] CATCH BLOCK - Error marking order ${orderId} manual_instruction:`, error);
    return NextResponse.json({ error: error.message || 'Server error updating order instruction.' }, { status: 500 });
  }
} 