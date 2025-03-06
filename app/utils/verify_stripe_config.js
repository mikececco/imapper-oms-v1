/**
 * Utility script to verify Stripe configuration and test webhook endpoint
 * 
 * Run with: node src/utils/verify_stripe_config.js
 */

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`
});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function verifyStripeConfig() {
  console.log('🔍 Verifying Stripe Configuration...');
  
  // Check if STRIPE_SECRET_KEY is set
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY is not set in your environment variables');
    return false;
  }
  
  if (process.env.STRIPE_SECRET_KEY.includes('your_complete_stripe_secret_key_here')) {
    console.error('❌ STRIPE_SECRET_KEY is set to a placeholder value. Please update with your actual Stripe secret key');
    return false;
  }
  
  // Check if STRIPE_WEBHOOK_SECRET is set
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is not set in your environment variables');
    return false;
  }
  
  // Verify Stripe API key by making a simple API call
  try {
    console.log('🔄 Testing Stripe API connection...');
    const balance = await stripe.balance.retrieve();
    console.log('✅ Successfully connected to Stripe API');
    
    // Print some account info to verify
    const account = await stripe.accounts.retrieve();
    console.log(`📊 Connected to Stripe account: ${account.business_profile?.name || account.email || account.id}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Stripe API:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('🔑 Your Stripe API key appears to be invalid. Please check your STRIPE_SECRET_KEY in .env.development');
      console.log('\n📝 To fix this issue:');
      console.log('1. Go to https://dashboard.stripe.com/apikeys');
      console.log('2. Copy your Secret key (starts with sk_test_ for test mode or sk_live_ for live mode)');
      console.log('3. Update the STRIPE_SECRET_KEY in your .env.development file');
    }
    
    return false;
  }
}

async function printWebhookInfo() {
  console.log('\n📡 Webhook Configuration:');
  console.log(`🔗 Webhook URL: http://localhost:${process.env.PORT || 5000}/api/webhook/stripe`);
  console.log(`🔑 Webhook Secret: ${process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Not set'}`);
  
  console.log('\n📋 To test your webhook locally:');
  console.log('1. Install the Stripe CLI: https://stripe.com/docs/stripe-cli');
  console.log('2. Run: stripe login');
  console.log(`3. Run: stripe listen --forward-to http://localhost:${process.env.PORT || 5000}/api/webhook/stripe`);
  console.log('4. In another terminal, run: stripe trigger invoice.created');
  
  // If we have a valid API key, list existing webhooks
  if (await verifyStripeConfig()) {
    try {
      console.log('\n🔍 Checking existing webhook endpoints in your Stripe account...');
      const webhookEndpoints = await stripe.webhookEndpoints.list();
      
      if (webhookEndpoints.data.length === 0) {
        console.log('ℹ️ No webhook endpoints found in your Stripe account');
      } else {
        console.log(`✅ Found ${webhookEndpoints.data.length} webhook endpoint(s):`);
        webhookEndpoints.data.forEach((endpoint, index) => {
          console.log(`\n📡 Webhook #${index + 1}:`);
          console.log(`🔗 URL: ${endpoint.url}`);
          console.log(`📋 Events: ${endpoint.enabled_events.join(', ')}`);
          console.log(`🔄 Status: ${endpoint.status}`);
        });
      }
    } catch (error) {
      console.error('❌ Error retrieving webhook endpoints:', error.message);
    }
  }
}

// Run the verification
(async () => {
  console.log('🛠️  Stripe Configuration Verification Tool 🛠️\n');
  await verifyStripeConfig();
  await printWebhookInfo();
})(); 