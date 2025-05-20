import Stripe from 'stripe';

export async function GET(req, { params }) {
  const { customerId } = params;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
    });
    const subscription = subscriptions.data[0];
    if (!subscription) {
      return new Response(JSON.stringify({ trial_end: null }), { status: 200 });
    }
    return new Response(JSON.stringify({
      trial_end: subscription.trial_end,
      status: subscription.status,
    }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 