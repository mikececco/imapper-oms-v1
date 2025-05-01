import { NextResponse } from 'next/server';
import { SHIPPING_OPTIONS } from '../../utils/constants';
import { createClient } from '@supabase/supabase-js';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY } from '../../utils/env';

// Create a server-side Supabase client
const serverSupabase = SERVER_SUPABASE_URL && SERVER_SUPABASE_ANON_KEY 
  ? createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY)
  : null;

// Force dynamic rendering to ensure this route is not statically optimized
export const dynamic = 'force-dynamic';

// Cache for API responses
let responseCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function GET(request) {
  const url = new URL(request.url);
  const bypassCache = url.searchParams.has('bypass_cache');
  const toCountry = url.searchParams.get('to_country')?.toUpperCase(); // Read and normalize to_country

  // Use cache key that includes the country for filtering
  const cacheKey = `shipping_methods_${toCountry || 'all'}`;
  const now = Date.now();
  if (!bypassCache && responseCache && responseCache[cacheKey] && (now - lastFetchTime < CACHE_TTL)) {
    console.log(`Returning cached filtered shipping methods for ${toCountry || 'all'}.`);
    return NextResponse.json(responseCache[cacheKey]);
  }
  
  try {
    if (!serverSupabase) {
      console.error('Supabase client not available for fetching shipping methods');
      // Don't return defaults, throw error as DB is expected to be populated
      return NextResponse.json({ error: 'Database connection error', success: false }, { status: 500 });
    }

    console.log(`Fetching all shipping methods from DB for filtering (to_country: ${toCountry || 'N/A'})...`);
    // Fetch all methods from the database
    const { data: allMethods, error } = await serverSupabase
      .from('shipping_methods')
      .select('*') // Select all needed columns (id, name, carrier, etc.)
      // .order('display_order', { ascending: true }); // Removed ordering by non-existent column
      // Optionally, order by name if desired:
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching shipping methods from DB:', error);
       return NextResponse.json({ error: 'Failed to fetch methods from database', success: false, details: error.message }, { status: 500 });
    }
    
    if (!allMethods || allMethods.length === 0) {
       console.warn('No shipping methods found in the database. Run sync?');
       return NextResponse.json({ success: true, data: [], source: 'database', message: 'No methods found in DB' });
    }

    console.log(`Fetched ${allMethods.length} total methods from DB. Applying filters...`);

    // Apply filtering logic based on toCountry using exact matches
    let filteredMethods = [];
    const frMethodName = 'DHL Express Domestic 0-70kg';
    const worldwideDapMethodName = 'DHL Express Worldwide 0-70kg - incoterm DAP';
    const economySelectMethodName = 'DHL Express Economy Select 0-70kg';

    if (toCountry === 'FR') {
      filteredMethods = allMethods.filter(m => m.name === frMethodName);
      console.log(`Filtered for FR (Exact Match: "${frMethodName}") (${filteredMethods.length} methods)`);
    } else if (toCountry === 'CH' || toCountry === 'GB') {
      filteredMethods = allMethods.filter(m => m.name === worldwideDapMethodName);
      console.log(`Filtered for CH/GB (Exact Match: "${worldwideDapMethodName}") (${filteredMethods.length} methods)`);
    } else if (toCountry === 'US') {
      filteredMethods = allMethods.filter(m => m.name === worldwideDapMethodName);
      console.log(`Filtered for US (Exact Match: "${worldwideDapMethodName}") (${filteredMethods.length} methods)`);
    } else if (toCountry) { // For any other specific country not matching above rules
      // Default rule: Filter *only* for the exact Economy Select name
      filteredMethods = allMethods.filter(m => m.name === economySelectMethodName);
      console.log(`Filtered for other country ${toCountry} (Exact Match: "${economySelectMethodName}") (${filteredMethods.length} methods)`);
    } else {
        // If no country provided, return all methods from DB (or handle as error?)
        console.log('No specific country provided, returning all DB methods.');
        filteredMethods = allMethods; 
    }
    
    // Prepare response with filtered data
    const response = {
      success: true,
      data: filteredMethods,
      source: 'database_filtered'
    };
    
    // Update cache with filtered results under the specific key
    if (!responseCache) responseCache = {};
    responseCache[cacheKey] = response;
    lastFetchTime = now; // Update timestamp for the whole cache object
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching/filtering shipping methods:', error);
    return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to process shipping methods' 
    }, { status: 500 });
  }
}

// Helper function to create the shipping_methods table (keep for potential first run)
async function createShippingMethodsTable() {
  if (!serverSupabase) return;
  
  // Create the table
  await serverSupabase.rpc('create_shipping_methods_table', {}, {
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  });
  
  // Insert default methods
  await serverSupabase
    .from('shipping_methods')
    .upsert(SHIPPING_OPTIONS.map(method => ({
      code: method,
      name: method.charAt(0) + method.slice(1).toLowerCase(),
      display_order: Object.values(SHIPPING_OPTIONS).indexOf(method) + 1,
      active: true
    })), {
      onConflict: 'code',
      ignoreDuplicates: false
    });
} 