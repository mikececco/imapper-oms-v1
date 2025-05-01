import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { parcelId } = params;

  if (!parcelId) {
    return NextResponse.json({ error: 'Parcel ID is required' }, { status: 400 });
  }

  console.log(`Proxying request for label for parcel ID: ${parcelId}`);

  const sendCloudApiKey = process.env.SENDCLOUD_API_KEY;
  const sendCloudApiSecret = process.env.SENDCLOUD_API_SECRET;

  if (!sendCloudApiKey || !sendCloudApiSecret) {
    console.error('SendCloud API credentials missing for label proxy.');
    return NextResponse.json({ error: 'SendCloud API credentials not configured' }, { status: 500 });
  }

  try {
    // Construct the actual SendCloud label URL (using normal_printer A4, position 0)
    // Adjust if you need label_printer or different positions
    const sendCloudLabelUrl = `https://panel.sendcloud.sc/api/v2/labels/normal_printer/${parcelId}?start_from=0`;

    const auth = Buffer.from(`${sendCloudApiKey}:${sendCloudApiSecret}`).toString('base64');

    console.log(`Fetching label from SendCloud URL: ${sendCloudLabelUrl}`);

    // Fetch the label PDF from SendCloud with authentication
    const sendCloudResponse = await fetch(sendCloudLabelUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      cache: 'no-store' // Don't cache the label fetch itself
    });

    if (!sendCloudResponse.ok) {
      const errorBody = await sendCloudResponse.text();
      console.error(`SendCloud label fetch error: ${sendCloudResponse.status} ${sendCloudResponse.statusText}`, errorBody);
      throw new Error(`Failed to fetch label from SendCloud: ${sendCloudResponse.statusText}`);
    }

    // Check content type - should be application/pdf
    const contentType = sendCloudResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/pdf')) {
        console.error('SendCloud did not return a PDF. Content-Type:', contentType);
        // Forward the response anyway? Or return an error?
        // Let's return an error for clarity
        return NextResponse.json({ error: 'SendCloud did not return a PDF label' }, { status: 502 }); // Bad Gateway
    }

    // Get the PDF content as an ArrayBuffer
    const pdfBuffer = await sendCloudResponse.arrayBuffer();

    // Return the PDF content to the client
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // Optional: Suggest a filename for download
        'Content-Disposition': `inline; filename="label-${parcelId}.pdf"`, 
      },
    });

  } catch (error) {
    console.error('Error proxying label request:', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve label' }, { status: 500 });
  }
}

// Ensure this route is dynamic
export const dynamic = 'force-dynamic'; 