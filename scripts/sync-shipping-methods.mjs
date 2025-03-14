import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: join(dirname(__dirname), '.env') });

// Initialize Supabase client with proper environment variables
const supabaseUrl = 'https://ppvcladrmrprkqclyycr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdmNsYWRybXJwcmtxY2x5eWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExODcxMTMsImV4cCI6MjA1Njc2MzExM30.MtKxAaj-XiDdlritn2G3OtCFLoTzsayL8-Pget09sMA';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSendCloudShippingMethods() {
  try {
    // Check if SendCloud API credentials are available
    const sendCloudApiKey = '8482aee7-1997-467f-969f-382fc92c9fdf';
    const sendCloudApiSecret = '1f4e21310bab41c180bfef9d6d753215';
    
    if (!sendCloudApiKey || !sendCloudApiSecret) {
      throw new Error('SendCloud API credentials not available');
    }
    
    // Prepare the SendCloud API credentials
    const auth = Buffer.from(`${sendCloudApiKey}:${sendCloudApiSecret}`).toString('base64');
    
    // Fetch shipping methods from SendCloud
    const response = await fetch('https://panel.sendcloud.sc/api/v2/shipping_methods', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch shipping methods');
    }
    
    const data = await response.json();
    return data.shipping_methods || [];
  } catch (error) {
    console.error('Error fetching shipping methods:', error);
    throw error;
  }
}

async function updateShippingMethods(shippingMethods) {
  try {
    // Filter for UPS Standard 0-70kg only
    const upsStandardMethod = shippingMethods.find(method => method.name === 'UPS Standard 0-70kg');
    
    if (!upsStandardMethod) {
      console.error('UPS Standard 0-70kg method not found');
      return;
    }

    console.log('Found UPS Standard 0-70kg method:', upsStandardMethod);
    
    // Get existing shipping method
    const { data: existingMethods } = await supabase
      .from('shipping_methods')
      .select('id')
      .eq('name', 'UPS Standard 0-70kg')
      .single();
    
    // Prepare the shipping method data - only include fields that exist in the database
    const shippingMethod = {
      id: upsStandardMethod.id,
      code: upsStandardMethod.code || `ups-standard-${upsStandardMethod.id}`,
      name: upsStandardMethod.name || 'UPS Standard 0-70kg',
      min_weight: upsStandardMethod.weight?.min || 0.0,
      max_weight: upsStandardMethod.weight?.max || 70.0,
      price: upsStandardMethod.price || 0.0,
      countries: Array.isArray(upsStandardMethod.countries) ? upsStandardMethod.countries : [],
      is_active: Boolean(upsStandardMethod.is_active),
      sendcloud_data: upsStandardMethod,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert or update based on whether it exists
    if (existingMethods?.id) {
      console.log('Updating existing UPS Standard method...');
      const { error: updateError } = await supabase
        .from('shipping_methods')
        .update(shippingMethod)
        .eq('id', shippingMethod.id);
      
      if (updateError) {
        console.error('Error updating UPS Standard method:', updateError);
        throw updateError;
      }
    } else {
      console.log('Inserting new UPS Standard method...');
      const { error: insertError } = await supabase
        .from('shipping_methods')
        .insert([shippingMethod]);
      
      if (insertError) {
        console.error('Error inserting UPS Standard method:', insertError);
        throw insertError;
      }
    }
    
    console.log('UPS Standard method sync completed successfully!');
  } catch (error) {
    console.error('Error updating shipping method:', error);
    throw error;
  }
}

// Main function to run the sync
async function syncShippingMethods() {
  try {
    console.log('Starting shipping methods sync...');
    
    // Fetch shipping methods from SendCloud
    const shippingMethods = await fetchSendCloudShippingMethods();
    console.log(`Fetched ${shippingMethods.length} shipping methods from SendCloud`);
    
    // Update shipping methods in database
    await updateShippingMethods(shippingMethods);
    
  } catch (error) {
    console.error('Shipping methods sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncShippingMethods(); 