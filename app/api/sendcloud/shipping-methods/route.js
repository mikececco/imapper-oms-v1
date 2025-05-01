import { NextResponse } from 'next/server';

// Removed cache variables and logic

export async function GET(request) {
  const url = new URL(request.url);
  const senderAddressId = url.searchParams.get('sender_address');
  const isReturn = url.searchParams.get('is_return');
  // Removed parameters not supported by /shipping_methods
  // const fromCountry = url.searchParams.get('from_country'); 
  // const toCountry = url.searchParams.get('to_country');     
  // const weight = url.searchParams.get('weight');         

  console.log('Fetching SendCloud shipping methods from API (/shipping_methods endpoint)...');
  const sendCloudApiKey = process.env.SENDCLOUD_API_KEY;
  const sendCloudApiSecret = process.env.SENDCLOUD_API_SECRET;

  if (!sendCloudApiKey || !sendCloudApiSecret) {
    console.error('SendCloud API credentials missing in environment variables.');
    return NextResponse.json({ error: 'SendCloud API credentials not configured' }, { status: 500 });
  }

  // Removed validation for from/to country
  // if (!fromCountry || !toCountry) { ... }

  try {
    // Reverted to /shipping_methods endpoint and panel.sendcloud.sc base URL
    const sendCloudUrl = new URL('https://panel.sendcloud.sc/api/v2/shipping_methods');
    
    // Removed parameters not supported by /shipping_methods
    // sendCloudUrl.searchParams.append('from_country', fromCountry);
    // sendCloudUrl.searchParams.append('to_country', toCountry);

    // Add supported optional parameters if provided
    if (senderAddressId) {
      sendCloudUrl.searchParams.append('sender_address', senderAddressId);
    }
    if (isReturn !== null) {
        sendCloudUrl.searchParams.append('is_return', isReturn); 
    }

    console.log(`Calling SendCloud API: ${sendCloudUrl.toString()}`);

    const auth = Buffer.from(`${sendCloudApiKey}:${sendCloudApiSecret}`).toString('base64');

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
      console.error(`SendCloud API error (${sendCloudUrl.toString()}): ${response.status} ${response.statusText}`, errorBody);
      let errorDetail = errorBody;
      try {
          errorDetail = JSON.parse(errorBody).error || errorBody;
      } catch (e) { /* Ignore parsing error */ }
      // Adjusted error message
      throw new Error(`Failed to fetch shipping methods from SendCloud: ${response.statusText} - ${errorDetail}`);
    }

    const data = await response.json();

    console.log('SendCloud API Response (Shipping Methods):', JSON.stringify(data, null, 2));

    // Expecting shipping_methods array again
    const responseData = { success: true, data: data.shipping_methods || [], source: 'sendcloud_api' }; 
    console.log(`Successfully fetched ${responseData.data.length} shipping methods from SendCloud.`);
    return NextResponse.json(responseData);

  } catch (error) {
    // Adjusted error message
    console.error('Error fetching shipping methods from SendCloud:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch shipping methods' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 