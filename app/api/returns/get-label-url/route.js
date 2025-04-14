import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchShippingDetails } from '../../../utils/sendcloud'; // Assuming sendcloud utils are here

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, // Ensure correct env vars are used
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const parcelId = searchParams.get('parcelId');

  if (!parcelId) {
    return NextResponse.json({ error: 'parcelId query parameter is required' }, { status: 400 });
  }

  console.log(`API Route: Attempting to fetch label URL for Parcel ID: ${parcelId}`);

  try {
    // Fetch shipping details from Sendcloud using the parcel ID
    const shippingDetails = await fetchShippingDetails(parcelId);

    if (shippingDetails.success && shippingDetails.labelUrl) {
      const labelUrl = shippingDetails.labelUrl;
      console.log(`API Route: Successfully fetched label URL: ${labelUrl} for Parcel ID: ${parcelId}`);

      // Update the order in Supabase with the fetched label URL
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
            sendcloud_return_label_url: labelUrl,
            updated_at: new Date().toISOString() 
         })
        .eq('sendcloud_return_parcel_id', parcelId); // Match using the parcel ID

      if (updateError) {
        console.error(`API Route: Failed to update Supabase order for Parcel ID ${parcelId} after fetching label:`, updateError);
        // Decide if we should still return the label URL even if DB update fails
        // For now, return success but log the error
        // Consider returning a specific error if DB update is critical
      } else {
         console.log(`API Route: Successfully updated order with label URL for Parcel ID: ${parcelId}`);
      }

      // Return the fetched label URL
      return NextResponse.json({ labelUrl: labelUrl });

    } else {
      // Handle cases where fetching details failed or label URL was missing
      console.error(`API Route: Failed to fetch label URL from Sendcloud for Parcel ID ${parcelId}. Reason: ${shippingDetails.error || 'Label URL missing in response'}`);
      return NextResponse.json({ error: shippingDetails.error || 'Failed to retrieve label URL from Sendcloud' }, { status: 500 });
    }
  } catch (error) {
    console.error(`API Route: CATCH BLOCK - Error fetching label URL for Parcel ID ${parcelId}:`, error);
    return NextResponse.json({ error: error.message || 'Server error fetching label URL' }, { status: 500 });
  }
} 