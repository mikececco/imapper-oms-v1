import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Assuming you use Supabase client helpers if needed

// Helper function to fetch Sendcloud return status (replace with your actual implementation)
async function fetchSendcloudReturnStatus(returnParcelId) {
  const apiKey = process.env.SENDCLOUD_API_KEY;
  const apiSecret = process.env.SENDCLOUD_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    console.error('Sendcloud API Key or Secret not configured.');
    throw new Error('Sendcloud API credentials missing');
  }

  const url = `https://panel.sendcloud.sc/api/v2/returns/${returnParcelId}`;
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Try to parse error, default to empty obj
      console.error(`Sendcloud API error for return ${returnParcelId}:`, response.status, errorData);
      throw new Error(`Sendcloud API Error: ${response.status} - ${errorData.error?.message || 'Failed to fetch status'}`);
    }

    const data = await response.json();
    // Extract the relevant status field from the Sendcloud response
    // Adjust 'data.return.status' based on the actual Sendcloud API response structure
    const status = data?.return?.status;
    
    if (!status) {
        console.warn(`Could not find status in Sendcloud response for ${returnParcelId}:`, data);
        throw new Error('Status not found in Sendcloud response');
    }
    
    return status; 

  } catch (error) {
    console.error(`Error fetching Sendcloud status for ${returnParcelId}:`, error);
    throw error; // Re-throw the error to be caught by the handler
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const returnParcelId = searchParams.get('returnParcelId');

  if (!returnParcelId) {
    return NextResponse.json({ error: 'returnParcelId query parameter is required' }, { status: 400 });
  }

  try {
    const status = await fetchSendcloudReturnStatus(returnParcelId);
    
    // Optional: Update the status in your database here if needed
    // const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    // const { error: dbError } = await supabase
    //   .from('orders')
    //   .update({ sendcloud_return_status: status, updated_at: new Date().toISOString() })
    //   .eq('sendcloud_return_parcel_id', returnParcelId);
    // if (dbError) { console.error("DB update error:", dbError); /* Handle appropriately */ }

    return NextResponse.json({ status });

  } catch (error) {
    console.error(`API route error for returnParcelId ${returnParcelId}:`, error);
    return NextResponse.json({ error: error.message || 'Failed to get return status' }, { status: 500 });
  }
} 