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
    console.log(`Sendcloud return status response for ${returnId}:`, JSON.stringify(data, null, 2)); // Log full response

    // ---- NEW STATUS EXTRACTION LOGIC ----
    let extractedStatus = 'Status Unknown'; // Default
    
    // 1. Prioritize latest status from history
    if (data.status_history && Array.isArray(data.status_history) && data.status_history.length > 0) {
      const latestHistoryItem = data.status_history[data.status_history.length - 1];
      // Use carrier_message if available, otherwise parent_status
      extractedStatus = latestHistoryItem.carrier_message || latestHistoryItem.parent_status || extractedStatus;
      console.log(`Extracted status from status_history for return ${returnId}:`, extractedStatus);
    }
    
    // 2. Fallback to top-level status if history didn't yield a status (or was empty/missing)
    if (extractedStatus === 'Status Unknown' && data.status) {
        extractedStatus = data.status;
        console.log(`Using top-level status as fallback for return ${returnId}:`, extractedStatus);
    }

    // Check if we still couldn't find a status
    if (extractedStatus === 'Status Unknown') {
        console.warn(`Could not determine a status for return ${returnId} from response:`, JSON.stringify(data, null, 2));
    }
    
    return extractedStatus; 
    // ---- END NEW STATUS EXTRACTION LOGIC ----

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
    console.log(`[API /returns/get-status] Received request for returnId: ${returnId}`);
    const status = await fetchSendcloudReturnStatus(returnId);
    console.log(`[API /returns/get-status] Fetched status for returnId ${returnId}: ${status}`);
    
    // --- Update the status in the database ---
    if (status && status !== 'Status Unknown') {
        console.log(`[API /returns/get-status] Attempting DB update for returnId ${returnId} with status: ${status}`);
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { error: dbError } = await supabase
          .from('orders')
          .update({ sendcloud_return_status: status, updated_at: new Date().toISOString() })
          .eq('sendcloud_return_id', returnId); // Match based on the return ID
          
        if (dbError) { 
            console.error(`[API /returns/get-status] DB update error for returnId ${returnId}:`, dbError);
            // Decide if this should cause the API to fail, or just log it.
            // For now, we log it but still return the fetched status.
        } else {
            console.log(`[API /returns/get-status] Successfully updated DB for returnId ${returnId}`);
        }
    } else {
        console.log(`[API /returns/get-status] Skipping DB update for returnId ${returnId} because status is unknown or empty.`);
    }
    // --- End DB Update ---

    return NextResponse.json({ status });

  } catch (error) {
    console.error(`API route error for returnId ${returnId}:`, error);
    return NextResponse.json({ error: error.message || 'Failed to get return status' }, { status: 500 });
  }
} 