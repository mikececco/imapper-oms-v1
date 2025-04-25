import { NextResponse } from 'next/server';
import { Buffer } from 'buffer'; // Node.js Buffer

export async function GET(request, { params }) {
  const parcelId = params.parcelId; // Get parcelId from the dynamic route segment

  const apiKey = process.env.SENDCLOUD_API_KEY;
  const apiSecret = process.env.SENDCLOUD_API_SECRET;

  if (!parcelId) {
    return NextResponse.json({ error: 'Missing parcel ID in request path' }, { status: 400 });
  }

  if (!apiKey || !apiSecret) {
    console.error('Sendcloud API credentials missing in environment variables.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const sendcloudLabelUrl = `https://panel.sendcloud.sc/api/v2/labels/normal_printer/${parcelId}`;
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  console.log(`Proxying label request for Parcel ID: ${parcelId} to URL: ${sendcloudLabelUrl}`);

  try {
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        // Do not set Content-Type for GET request expecting PDF
      },
      // Important: Set cache policy if needed, default might cache
      cache: 'no-store' 
    };

    const sendcloudResponse = await fetch(sendcloudLabelUrl, fetchOptions);

    if (!sendcloudResponse.ok) {
      // Try to get error details from Sendcloud response
      let errorBody = 'Unknown Sendcloud Error';
      try {
        errorBody = await sendcloudResponse.text(); // Get text or json based on expected error format
      } catch (e) { /* Ignore parsing error */ }
      
      console.error(`Sendcloud API error (${sendcloudResponse.status}) fetching label for ${parcelId}: ${errorBody}`);
      throw new Error(`Failed to fetch label from Sendcloud: Status ${sendcloudResponse.status}`);
    }

    // Get the response body as a ReadableStream
    const body = sendcloudResponse.body;
    if (!body) {
       throw new Error('Sendcloud response body is empty');
    }

    // Stream the PDF back to the client
    const headers = new Headers({
      'Content-Type': 'application/pdf',
      // Optional: Suggest a filename for download
      'Content-Disposition': `inline; filename="return_label_${parcelId}.pdf"`,
    });

    // Return the response with the PDF stream and headers
    return new Response(body, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error(`Error proxying Sendcloud label request for Parcel ID ${parcelId}:`, error);
    return NextResponse.json({ error: error.message || 'Failed to proxy label download' }, { status: 500 });
  }
} 