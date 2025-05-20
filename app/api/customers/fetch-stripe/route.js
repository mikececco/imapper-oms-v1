import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = createRouteHandlerClient({ cookies });

    // Get all customers with Stripe IDs
    const { data: customers, error: fetchError } = await supabase
      .from('customers')
      .select('id, stripe_customer_id')
      .not('stripe_customer_id', 'is', null);

    if (fetchError) {
      throw new Error(`Error fetching customers: ${fetchError.message}`);
    }

    // Process each customer
    const updates = await Promise.all(customers.map(async (customer) => {
      try {
        // Fetch latest subscription for the customer
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.stripe_customer_id,
          limit: 1,
          status: 'all',
        });

        const subscription = subscriptions.data[0];
        
        // Prepare subscription data
        const subscriptionData = subscription ? {
          subscription_id: subscription.id,
          status: subscription.status,
          trial_start: subscription.trial_start,
          trial_end: subscription.trial_end,
          current_period_end: subscription.current_period_end,
          cancel_at: subscription.cancel_at,
          canceled_at: subscription.canceled_at,
          ended_at: subscription.ended_at,
        } : null;

        // Update customer in database
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            stripe_subscription_data: subscriptionData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customer.id);

        if (updateError) {
          console.error(`Error updating customer ${customer.id}:`, updateError);
          return { success: false, customer: customer.id, error: updateError.message };
        }

        return { success: true, customer: customer.id };
      } catch (error) {
        console.error(`Error processing customer ${customer.id}:`, error);
        return { success: false, customer: customer.id, error: error.message };
      }
    }));

    // Count successes and failures
    const successful = updates.filter(u => u.success).length;
    const failed = updates.filter(u => !u.success).length;

    return new Response(JSON.stringify({
      message: `Updated ${successful} customers, ${failed} failed`,
      details: updates
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in fetch-stripe route:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 