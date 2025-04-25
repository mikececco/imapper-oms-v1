import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Optional for DB updates

// Helper function to fetch Sendcloud OUTBOUND PARCEL status
// NOTE: Adjust the URL and response parsing based on Sendcloud's actual API for parcels
async function fetchSendcloudShipmentStatus(shippingId, trackingNumber) {
  const apiKey = process.env.SENDCLOUD_API_KEY;
  const apiSecret = process.env.SENDCLOUD_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Sendcloud API Key or Secret not configured.');
    throw new Error('Sendcloud API credentials missing');
  }

  // Determine which identifier to use for the API call
  // Sendcloud might use parcel ID (shippingId) or tracking number
  // *** Adjust URL based on Sendcloud documentation for tracking outbound parcels ***
  let apiUrl;
  if (shippingId) {
    apiUrl = `https://panel.sendcloud.sc/api/v2/parcels/${shippingId}`; // Example URL for parcel by ID
  } else if (trackingNumber) {
    apiUrl = `https://panel.sendcloud.sc/api/v2/parcels?tracking_number=${trackingNumber}`; // Example URL for parcel by tracking
  } else {
    throw new Error('Either shippingId or trackingNumber is required');
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  try {
    console.log(`Fetching Sendcloud shipment status from: ${apiUrl}`);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Sendcloud API error for shipment query (${apiUrl}):`, response.status, errorData);
      throw new Error(`Sendcloud API Error: ${response.status} - ${errorData.error?.message || 'Failed to fetch status'}`);
    }

    const data = await response.json();

    // *** Adjust parsing based on Sendcloud API response structure for parcels ***
    // If querying by tracking number, it might return an array
    const parcelData = Array.isArray(data.parcels) ? data.parcels[0] : data.parcel;

    const status = parcelData?.status?.message; // Example: Get status message

    if (!status) {
      console.warn(`Could not find status in Sendcloud shipment response (${apiUrl}):`, data);
      // Consider returning 'Status Unavailable' or similar instead of throwing error
      return 'Status Unavailable';
      // throw new Error('Status not found in Sendcloud response');
    }

    return status;

  } catch (error) {
    console.error(`Error fetching Sendcloud shipment status (${apiUrl}):`, error);
    throw error; // Re-throw
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const shippingId = searchParams.get('shippingId');
  const trackingNumber = searchParams.get('trackingNumber');
  const orderId = searchParams.get('orderId'); // Get orderId if passed

  if (!shippingId && !trackingNumber) {
    return NextResponse.json({ error: 'shippingId or trackingNumber query parameter is required' }, { status: 400 });
  }
   if (!orderId) {
     return NextResponse.json({ error: 'orderId query parameter is required for DB update' }, { status: 400 });
   }


  try {
    const status = await fetchSendcloudShipmentStatus(shippingId, trackingNumber);

    // --- Optional: Update the status in your database ---
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error: dbError } = await supabase
      .from('orders')
      .update({ upgrade_status: status, updated_at: new Date().toISOString() })
      .eq('id', orderId); // Use the passed orderId

    if (dbError) {
      console.error("DB update error for upgrade_status:", dbError);
      // Decide how to handle DB errors - maybe still return status but log error?
      // For now, we'll proceed but log it.
    }
    // --- End Optional DB Update ---


    return NextResponse.json({ status });

  } catch (error) {
    console.error(`API route error for shipment status query:`, error);
    return NextResponse.json({ error: error.message || 'Failed to get shipment status' }, { status: 500 });
  }
} 