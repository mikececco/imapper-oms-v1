import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createReturnLabel } from '../../../utils/sendcloud';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  console.log("--- Return Label API Route START ---"); // Log start
  let orderId;
  try {
    const { 
      orderId: receivedOrderId, // Rename to avoid conflict in catch block scope
      returnFromAddress, 
      returnToAddress, 
      parcelWeight, 
      returnReason // ADDED: Extract returnReason
    } = await request.json();
    orderId = receivedOrderId; // Assign to outer scope variable

    // --- Add Logging --- 
    console.log(`API Route: Received Order ID: ${orderId}`);
    console.log(`API Route: Checking Environment Variables...`);
    const publicKeyExists = !!process.env.SENDCLOUD_PUBLIC_KEY;
    const secretKeyExists = !!process.env.SENDCLOUD_SECRET_KEY;
    console.log(`API Route: SENDCLOUD_PUBLIC_KEY exists? ${publicKeyExists}`);
    console.log(`API Route: SENDCLOUD_SECRET_KEY exists? ${secretKeyExists}`);
    // Log the first few chars of the public key if it exists, to verify partially
    if (publicKeyExists) {
      console.log(`API Route: Public Key starts with: ${process.env.SENDCLOUD_PUBLIC_KEY.substring(0, 5)}...`);
    }
    // --- End Logging --- 

    if (!orderId) {
      console.error("API Route Error: Order ID missing");
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    // Validate returnFromAddress (customer)
    if (!returnFromAddress || typeof returnFromAddress !== 'object' || !returnFromAddress.line1 || !returnFromAddress.city || !returnFromAddress.postal_code || !returnFromAddress.country) {
       return NextResponse.json({ error: 'Valid customer return address (Return From) is required' }, { status: 400 });
    }
    
    // Validate returnToAddress (warehouse)
    if (!returnToAddress || typeof returnToAddress !== 'object' || !returnToAddress.line1 || !returnToAddress.city || !returnToAddress.postal_code || !returnToAddress.country) {
       return NextResponse.json({ error: 'Valid warehouse return address (Return To) is required' }, { status: 400 });
    }

    // Validate parcelWeight (basic check for positive number format)
    if (!parcelWeight || typeof parcelWeight !== 'string' || parseFloat(parcelWeight) <= 0 || !/^\d*\.?\d+$/.test(parcelWeight)) {
       return NextResponse.json({ error: 'Valid parcel weight (e.g., 1.000) is required' }, { status: 400 });
    }

    // ADDED: Validate returnReason (ensure it's a non-empty string)
    if (!returnReason || typeof returnReason !== 'string' || returnReason.trim() === '') {
       return NextResponse.json({ error: 'A valid return reason is required' }, { status: 400 });
    }

    // Fetch order details from Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id') // Only need ID for update
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error(`API Route Error: Order ${orderId} not found or DB error:`, orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`API Route: Calling createReturnLabel utility for Order ID: ${orderId}`);
    // Create return label - now returns labelUrl as well
    const sendcloudReturnData = await createReturnLabel(order, returnFromAddress, returnToAddress, parcelWeight);
    console.log(`API Route: createReturnLabel utility call completed for Order ID: ${orderId}`, sendcloudReturnData);

    // --- Update Supabase Order ---
    const updatePayload = {
        sendcloud_return_id: sendcloudReturnData.return_id,
        sendcloud_return_parcel_id: sendcloudReturnData.parcel_id,
        sendcloud_return_label_url: sendcloudReturnData.labelUrl,
        sendcloud_return_reason: returnReason, // ADDED: Include reason in payload
        updated_at: new Date().toISOString(),
        // Optional: Update return status if needed
        // sendcloud_return_status: sendcloudReturnData.labelUrl ? 'label_created' : 'pending_label_fetch'
    };
    console.log(`API Route: Updating Supabase order ${orderId} with payload:`, updatePayload);
    
    const { error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (updateError) {
      console.error(`API Route Error: Failed to update Supabase order ${orderId}:`, updateError);
      // Decide if this should be a user-facing error or just logged
      // If Sendcloud succeeded, maybe still return success? Or maybe error out?
      // For now, throwing error to indicate partial failure.
      throw new Error(`Failed to update order in database after creating Sendcloud return: ${updateError.message}`);
    }
    console.log(`API Route: Successfully updated Supabase order ${orderId}.`);

    // --- Return Response ---
    console.log(`API Route: Successfully processed return for Order ID: ${orderId}. Returning IDs, Label URL, and Reason.`);
    // Return the label URL along with the IDs and reason
    return NextResponse.json({
      message: 'Sendcloud return initiated successfully.',
      sendcloud_return_id: sendcloudReturnData.return_id,
      sendcloud_return_parcel_id: sendcloudReturnData.parcel_id,
      sendcloud_return_label_url: sendcloudReturnData.labelUrl,
      sendcloud_return_reason: returnReason // ADDED: Optionally return reason too
    });
    
  } catch (error) {
    console.error(`API Route: CATCH BLOCK - Error creating return label for Order ID: ${orderId || 'Unknown'}`, error);
    // Ensure the error message passed to the client is useful but not overly detailed
    const clientErrorMessage = error.message.startsWith('Sendcloud API Error') || error.message.startsWith('Failed to update order')
      ? error.message
      : 'Failed to create return label';
    return NextResponse.json(
      { error: clientErrorMessage },
      { status: 500 } // Use appropriate status code based on error type if possible
    );
  } finally {
     console.log("--- Return Label API Route END ---"); // Log end
  }
} 