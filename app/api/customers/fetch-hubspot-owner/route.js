import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchHubSpotOwner } from '../../../utils/hubspot';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get and update HubSpot owner for a customer
 * 
 * GET /api/customers/fetch-hubspot-owner?customerId=123456789
 */
export async function GET(request) {
  try {
    // Get the customer ID from the query parameters
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Fetch customer details from Supabase
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ 
        error: 'Customer not found' 
      }, { status: 404 });
    }

    if (!customer.email) {
      return NextResponse.json({ 
        error: 'Customer has no email address' 
      }, { status: 400 });
    }
    
    // Fetch HubSpot owner information
    const result = await fetchHubSpotOwner(customer.email);
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }

    // Update the customer with the HubSpot owner name
    const { error: updateError } = await supabase
      .from('customers')
      .update({ hubspot_owner: result.owner.name })
      .eq('id', customerId);

    if (updateError) {
      console.error('Error updating customer:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update customer with HubSpot owner' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      owner: result.owner
    });
  } catch (error) {
    console.error('Error fetching HubSpot owner:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 