import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY } from '../../../../utils/env';

// Create a server-side Supabase client
const supabase = SERVER_SUPABASE_URL && SERVER_SUPABASE_ANON_KEY && SERVER_SUPABASE_URL !== 'build-placeholder'
  ? createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY)
  : null;

export async function DELETE(request, { params }) {
  try {
    // Check if Supabase client is initialized
    if (!supabase) {
      console.error('Supabase client not initialized');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Get the order ID from the URL
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    // Delete the order from Supabase
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting order:', error);
      return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Order deleted successfully' 
    });
  } catch (error) {
    console.error('Error in delete order API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 