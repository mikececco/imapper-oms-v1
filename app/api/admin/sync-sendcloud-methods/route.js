import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (ensure these are correct for server-side)
const supabaseUrl = process.env.NEXT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_SUPABASE_ANON_KEY; 
// Use service role key if needed for elevated privileges, otherwise anon key might suffice if RLS allows upserts
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

let supabase;
try {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables for sync');
  }
  supabase = createClient(supabaseUrl, supabaseAnonKey); // Or use service key if necessary
} catch (error) {
  console.error('Failed to initialize Supabase client for sync:', error);
}

// Basic check for admin/auth - REPLACE with actual robust authentication/authorization
function isAdminRequest(request) {
    // Example: Check for a specific header or cookie
    // THIS IS NOT SECURE FOR PRODUCTION
    const adminHeader = request.headers.get('X-Admin-Secret');
    return adminHeader === process.env.ADMIN_SECRET_KEY; // Ensure ADMIN_SECRET_KEY is set
}

export async function POST(request) {
  if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database client not initialized' }, { status: 500 });
  }

  console.log('Starting SendCloud shipping methods sync...');

  const sendCloudApiKey = process.env.SENDCLOUD_API_KEY;
  const sendCloudApiSecret = process.env.SENDCLOUD_API_SECRET;

  if (!sendCloudApiKey || !sendCloudApiSecret) {
    console.error('SendCloud API credentials missing.');
    return NextResponse.json({ error: 'SendCloud API credentials not configured' }, { status: 500 });
  }

  try {
    // 1. Fetch all methods from SendCloud
    const sendCloudUrl = new URL('https://panel.sendcloud.sc/api/v2/shipping_methods');
    // Add sender_address=YOUR_DEFAULT_SENDER_ID if needed to get specific contract methods
    // sendCloudUrl.searchParams.append('sender_address', 'YOUR_DEFAULT_SENDER_ADDRESS_ID');

    const auth = Buffer.from(`${sendCloudApiKey}:${sendCloudApiSecret}`).toString('base64');
    console.log(`Fetching from SendCloud: ${sendCloudUrl.toString()}`);

    const response = await fetch(sendCloudUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`SendCloud API error during sync: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Failed to fetch shipping methods from SendCloud: ${response.statusText}`);
    }

    const sendCloudData = await response.json();
    const methods = sendCloudData.shipping_methods || [];

    if (methods.length === 0) {
      console.warn('SendCloud returned 0 shipping methods. Nothing to sync.');
      return NextResponse.json({ message: 'SendCloud returned 0 shipping methods. Nothing to sync.', count: 0 });
    }

    console.log(`Fetched ${methods.length} methods from SendCloud.`);

    // 2. Prepare data for Supabase upsert
    const methodsToUpsert = methods.map(method => ({
      id: method.id, // Assuming SendCloud ID is the primary key in your table
      name: method.name,
      carrier: method.carrier,
      min_weight: method.min_weight,
      max_weight: method.max_weight,
      service_point_input: method.service_point_input,
      // Map other relevant fields from SendCloud response to your table columns
      raw_data: method // Store the full object for future reference
      // active: true, // Maybe set default active status?
      // display_order: method.id // Or some other logic?
    }));

    // 3. Upsert into Supabase
    console.log(`Upserting ${methodsToUpsert.length} methods into Supabase table 'shipping_methods'...`);
    const { data: upsertData, error: upsertError } = await supabase
      .from('shipping_methods')
      .upsert(methodsToUpsert, { onConflict: 'id', ignoreDuplicates: false });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      throw new Error(`Failed to save shipping methods to database: ${upsertError.message}`);
    }

    // Supabase upsert doesn't typically return the count of affected rows easily in v2 JS lib
    // We log the attempt count instead.
    const upsertedCount = methodsToUpsert.length;
    console.log(`Successfully upserted ${upsertedCount} methods.`);

    return NextResponse.json({ 
        message: `Successfully synced ${upsertedCount} shipping methods from SendCloud.`, 
        count: upsertedCount
    });

  } catch (error) {
    console.error('Error during SendCloud shipping methods sync:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}

// Ensure this route is dynamic
export const dynamic = 'force-dynamic'; 