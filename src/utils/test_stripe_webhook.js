/**
 * Utility script to help test Stripe webhooks locally
 * 
 * To use this script:
 * 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 * 2. Login to Stripe CLI: stripe login
 * 3. Run this script: node src/utils/test_stripe_webhook.js
 * 4. In another terminal, forward events to your local server:
 *    stripe listen --forward-to http://localhost:5000/api/webhook/stripe
 * 5. Trigger test events:
 *    stripe trigger invoice.created
 *    stripe trigger invoice.paid
 *    stripe trigger payment_intent.succeeded
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`
});

console.log('Stripe Webhook Testing Utility');
console.log('==============================');
console.log('');
console.log('This script provides instructions for testing your Stripe webhooks locally.');
console.log('');
console.log('1. Make sure you have the Stripe CLI installed:');
console.log('   https://stripe.com/docs/stripe-cli');
console.log('');
console.log('2. Login to your Stripe account:');
console.log('   stripe login');
console.log('');
console.log('3. In a separate terminal, forward events to your local server:');
console.log('   stripe listen --forward-to http://localhost:5000/api/webhook/stripe');
console.log('');
console.log('4. Copy the webhook signing secret from the output of the listen command');
console.log('   and add it to your .env.development file as STRIPE_WEBHOOK_SECRET');
console.log('');
console.log('5. Trigger test events:');
console.log('   stripe trigger invoice.created');
console.log('   stripe trigger invoice.paid');
console.log('   stripe trigger payment_intent.succeeded');
console.log('   stripe trigger customer.subscription.created');
console.log('');
console.log('For more information, see:');
console.log('https://stripe.com/docs/webhooks/test');

// Verify Stripe configuration
async function verifyStripeConfig() {
  try {
    console.log('\nVerifying Stripe configuration...');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Error: STRIPE_SECRET_KEY is not set in your environment variables');
      return;
    }
    
    // Test the Stripe connection
    const balance = await stripe.balance.retrieve();
    console.log('✅ Successfully connected to Stripe API');
    
    // Check webhook secret
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('⚠️ Warning: STRIPE_WEBHOOK_SECRET is not set in your environment variables');
      console.warn('   You will need this for webhook signature verification');
    } else {
      console.log('✅ STRIPE_WEBHOOK_SECRET is configured');
    }
    
    console.log('\nYour Stripe configuration appears to be valid.');
    console.log('You can now test your webhooks using the Stripe CLI.');
  } catch (error) {
    console.error('Error connecting to Stripe:', error.message);
  }
}

// Run the verification
verifyStripeConfig(); 