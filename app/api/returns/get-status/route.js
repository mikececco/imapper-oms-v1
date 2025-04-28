import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Assuming you use Supabase client helpers if needed

// Helper function to fetch Sendcloud return status
async function fetchSendcloudReturnStatus(returnId) {
  const apiKey = process.env.SENDCLOUD_API_KEY;
  const apiSecret = process.env.SENDCLOUD_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    console.error('Sendcloud API Key or Secret not configured.');
    throw new Error('Sendcloud API credentials missing');
  }

  const url = `https://panel.sendcloud.sc/api/v3/returns/${returnId}`;
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  try {
    console.log(`Fetching Sendcloud return status from: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Try to parse error, default to empty obj
      console.error(`Sendcloud API error for return ${returnId}:`, response.status, errorData);
      throw new Error(`Sendcloud API Error: ${response.status} - ${errorData.error?.message || 'Failed to fetch status'}`);
    }

    const data = await response.json();
    console.log(`Sendcloud return status response for ${returnId}:`, data);

    // Extract the relevant status field from the Sendcloud V2 response
    // Correct path based on logs: data.incoming_parcel_status.message
    const status = data?.incoming_parcel_status?.message;
    
    if (!status) {
        console.warn(`Could not find status message in Sendcloud response for return ${returnId} at path 'incoming_parcel_status.message':`, data);
        return 'Status Unknown';
    }
    
    return status; 

  } catch (error) {
    console.error(`Error fetching Sendcloud status for return ${returnId}:`, error);
    throw error; // Re-throw the error to be caught by the handler
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const returnId = searchParams.get('returnId');

  if (!returnId) {
    return NextResponse.json({ error: 'returnId query parameter is required' }, { status: 400 });
  }

  try {
    const status = await fetchSendcloudReturnStatus(returnId);
    
    // Optional: Update the status in your database here if needed
    // const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    // const { error: dbError } = await supabase
    //   .from('orders')
    //   .update({ sendcloud_return_status: status, updated_at: new Date().toISOString() })
    //   .eq('sendcloud_return_id', returnId);
    // if (dbError) { console.error("DB update error:", dbError); /* Handle appropriately */ }

    return NextResponse.json({ status });

  } catch (error) {
    console.error(`API route error for returnId ${returnId}:`, error);
    return NextResponse.json({ error: error.message || 'Failed to get return status' }, { status: 500 });
  }
} 