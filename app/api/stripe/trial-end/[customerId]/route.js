import Stripe from 'stripe';

export async function GET(req, { params }) {
  const { customerId } = params;
  
  // If no customer ID provided, return early
  if (!customerId) {
    return new Response(JSON.stringify({ 
      trial_end: null,
      status: null,
      message: 'No customer ID provided' 
    }), { status: 200 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    // First check if customer exists
    try {
      await stripe.customers.retrieve(customerId);
    } catch (customerError) {
      // Customer doesn't exist or mode mismatch (test/live)
      return new Response(JSON.stringify({ 
        trial_end: null,
        status: null,
        message: 'Customer not found or invalid mode'
      }), { status: 200 });
    }

    // If customer exists, get subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
    });
    
    const subscription = subscriptions.data[0];
    
    // No subscription found
    if (!subscription) {
      return new Response(JSON.stringify({ 
        trial_end: null,
        status: null,
        message: 'No subscription found'
      }), { status: 200 });
    }
    
    // Success case
    return new Response(JSON.stringify({
      trial_end: subscription.trial_end,
      status: subscription.status,
      subscription_id: subscription.id,
      link: `https://dashboard.stripe.com/subscriptions/${subscription.id}`,
      message: 'Subscription found'
    }), { status: 200 });

  } catch (error) {
    console.error('Stripe API error:', error);
    
    // Return a graceful response even on error
    return new Response(JSON.stringify({ 
      trial_end: null,
      status: null,
      message: 'Failed to fetch subscription data'
    }), { status: 200 });
  }
} 