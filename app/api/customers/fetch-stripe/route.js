import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY, STRIPE_SECRET_KEY } from '../../../utils/env';
import { extractHouseNumber } from '../../../utils/supabase';

// Initialize Stripe with your secret key
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
}) : null;

// Initialize Supabase client
const supabase = SERVER_SUPABASE_URL && SERVER_SUPABASE_ANON_KEY && SERVER_SUPABASE_URL !== 'build-placeholder'
  ? createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY)
  : null;

export async function GET(request) {
  try {
    // Check if clients aren't initialized
    if (!stripe || !supabase) {
      console.error('Stripe or Supabase client not initialized');
      return NextResponse.json({ error: 'Service unavailable during build or initialization' }, { status: 503 });
    }

    // Get the customer ID from the query parameters
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    try {
      // Fetch customer data from Stripe
      const stripeCustomer = await stripe.customers.retrieve(customerId);

      if (!stripeCustomer) {
        return NextResponse.json({ error: 'Customer not found in Stripe' }, { status: 404 });
      }

      // Prepare customer data for our database
      const customerData = {
        stripe_customer_id: stripeCustomer.id,
        name: stripeCustomer.name || 'New Customer',
        email: stripeCustomer.email || '',
        phone: stripeCustomer.phone || '',
        address_line1: stripeCustomer.address?.line1 || '',
        address_line2: stripeCustomer.address?.line2 || '',
        address_city: stripeCustomer.address?.city || '',
        address_postal_code: stripeCustomer.address?.postal_code || '',
        address_country: stripeCustomer.address?.country || '',
        metadata: stripeCustomer.metadata || {}
      };

      // If shipping address exists, use it instead of billing address
      if (stripeCustomer.shipping && stripeCustomer.shipping.address) {
        customerData.address_line1 = stripeCustomer.shipping.address.line1 || customerData.address_line1;
        customerData.address_line2 = stripeCustomer.shipping.address.line2 || customerData.address_line2;
        customerData.address_city = stripeCustomer.shipping.address.city || customerData.address_city;
        customerData.address_postal_code = stripeCustomer.shipping.address.postal_code || customerData.address_postal_code;
        customerData.address_country = stripeCustomer.shipping.address.country || customerData.address_country;
      }

      // Extract house number and update address_line1
      const { houseNumber, streetLine } = extractHouseNumber(customerData.address_line1);
      customerData.address_house_number = houseNumber;
      customerData.address_line1 = streetLine;

      // Check if customer already exists in our database
      const { data: existingCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('stripe_customer_id', customerId)
        .single();

      let result;
      let isUpdate = false;
      
      if (existingCustomer) {
        // Update existing customer
        isUpdate = true;
        result = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', existingCustomer.id)
          .select()
          .single();
      } else {
        // Create new customer
        result = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      // Return the customer data with a flag indicating if it was an update
      return NextResponse.json({
        ...result.data,
        isUpdate
      });
    } catch (stripeError) {
      // Handle Stripe API errors specifically
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json({ 
          error: 'Invalid Stripe customer ID. Please check and try again.' 
        }, { status: 400 });
      }
      throw stripeError;
    }
  } catch (error) {
    console.error('Error handling customer fetch:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch customer data' }, { status: 500 });
  }
} 