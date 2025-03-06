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

// Convert the SHIPPING_OPTIONS object to an array of objects for fallback
const defaultMethods = Object.entries(SHIPPING_OPTIONS).map(([key, value], index) => ({
  id: index + 1,
  code: value,
  name: key.charAt(0) + key.slice(1).toLowerCase(),
  display_order: index + 1,
  active: true
}));

// Cache for API responses
let responseCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function GET(request) {
  // Check for cache busting parameter
  const url = new URL(request.url);
  const bypassCache = url.searchParams.has('bypass_cache');
  
  // Check if we have a valid cache
  const now = Date.now();
  if (!bypassCache && responseCache && (now - lastFetchTime < CACHE_TTL)) {
    return NextResponse.json(responseCache);
  }
  
  try {
    // Check if we have a valid Supabase client
    if (!serverSupabase) {
      console.log('No valid Supabase client, using default shipping methods');
      
      const response = {
        success: true,
        data: defaultMethods,
        source: 'default'
      };
      
      // Update cache
      responseCache = response;
      lastFetchTime = now;
      
      return NextResponse.json(response);
    }

    // Try to fetch shipping methods from the database
    const { data, error } = await serverSupabase
      .from('shipping_methods')
      .select('*')
      .order('display_order', { ascending: true });
    
    // If there's an error or no data, return the default shipping methods
    if (error || !data || data.length === 0) {
      // Check if the error is because the table doesn't exist
      const isTableNotExistError = error && error.code === '42P01';
      
      if (isTableNotExistError) {
        console.log('Shipping methods table does not exist, using default methods');
        
        // Try to create the table if it doesn't exist
        try {
          await createShippingMethodsTable();
        } catch (createError) {
          console.error('Failed to create shipping methods table:', createError);
        }
      } else {
        console.log('Using default shipping methods from constants:', error);
      }
      
      const response = {
        success: true,
        data: defaultMethods,
        source: 'default',
        error: error ? error.message : null
      };
      
      // Update cache
      responseCache = response;
      lastFetchTime = now;
      
      return NextResponse.json(response);
    }
    
    // Return the shipping methods from the database
    const response = {
      success: true,
      data,
      source: 'database'
    };
    
    // Update cache
    responseCache = response;
    lastFetchTime = now;
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching shipping methods:', error);
    
    // Return default shipping methods in case of error
    const response = {
      success: true,
      data: defaultMethods,
      source: 'default',
      error: error.message
    };
    
    // Update cache
    responseCache = response;
    lastFetchTime = now;
    
    return NextResponse.json(response);
  }
}

// Helper function to create the shipping_methods table
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
    .upsert(defaultMethods.map(method => ({
      code: method.code,
      name: method.name,
      display_order: method.display_order,
      active: method.active
    })), {
      onConflict: 'code',
      ignoreDuplicates: false
    });
} 