import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY } from '../../../utils/env';

// Use the client initialized with the anon key
const supabase = createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY);

export async function PATCH(request, { params }) {
  try {
    const { id } = params; // Get request ID from the route parameters
    const { status } = await request.json(); // Expecting { status: 'Done' }

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    if (!status || typeof status !== 'string') {
        return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });
    }

    console.log(`Updating status for feature request ${id} to: "${status}"`);

    // Attempt the update without selecting the result immediately
    const { error } = await supabase
      .from('feature_requests')
      .update({ 
        status: status,
        // updated_at: new Date().toISOString() // Optional
      })
      .eq('id', id);
      // Removed .select().single()

    // Check for error immediately after the update attempt
    if (error) {
      console.error('Error updating feature request status (Supabase):', error);
      // Check for RLS error specifically
      if (error.message.includes('violates row-level security policy')) {
        return NextResponse.json({ error: 'Permission denied. Check RLS update policy or base GRANT permissions.', details: error.message }, { status: 403 });
      }
      // Check for permission error (might manifest differently)
      if (error.code === '42501') { // PostgreSQL permission denied code
         return NextResponse.json({ error: 'Database permission denied for update operation.', details: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: 'Failed to update request status', details: error.message }, { status: 500 });
    }

    // If no error occurred during the update, return success
    // We don't have the updated data here, but the frontend can handle it
    return NextResponse.json({ 
      success: true, 
      message: 'Feature request status updated successfully (no data returned)'
      // request: data // Removed as data is not fetched here
    });

  } catch (error) {
    console.error('Error updating feature request status (Catch Block):', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
} 