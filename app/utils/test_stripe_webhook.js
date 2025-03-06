// Utility script to test the Stripe webhook with a customer creation event
const fetch = require('node-fetch');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development' });

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const WEBHOOK_URL = 'http://localhost:3000/api/webhook/stripe';

if (!WEBHOOK_SECRET) {
  console.error('Missing STRIPE_WEBHOOK_SECRET environment variable. Please check your configuration.');
  process.exit(1);
}

// Create a sample customer object with address information
const customerObject = {
  id: `cus_test_${Date.now()}`,
  object: 'customer',
  created: Math.floor(Date.now() / 1000),
  email: 'test@example.com',
  name: 'Test Customer',
  phone: '+33612345678',
  address: {
    city: 'ANIANE',
    line1: '23 bis boulevard Félix Giraud',
    line2: null,
    state: null,
    country: 'FR',
    postal_code: '34150'
  },
  metadata: {
    notes: 'Test customer created via webhook test script',
    package: 'Premium Pack',
    invoice_id: `in_test_${Date.now()}`
  }
};

// Create a sample event
const event = {
  id: `evt_test_${Date.now()}`,
  object: 'event',
  api_version: '2020-08-27',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: customerObject
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: null,
    idempotency_key: null
  },
  type: 'customer.created'
};

// Sign the payload with the webhook secret
function signPayload(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return {
    timestamp,
    signature,
    signatureHeader: `t=${timestamp},v1=${signature}`
  };
}

async function testWebhook() {
  try {
    console.log('Testing Stripe webhook with customer.created event...');
    console.log(`Customer ID: ${customerObject.id}`);
    console.log(`Event ID: ${event.id}`);
    
    // Convert the event to a string
    const payload = JSON.stringify(event);
    
    // Sign the payload
    const { signatureHeader } = signPayload(payload, WEBHOOK_SECRET);
    
    // Send the request to the webhook endpoint
    console.log(`Sending request to ${WEBHOOK_URL}...`);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signatureHeader
      },
      body: payload
    });
    
    // Parse the response
    const responseData = await response.json();
    
    console.log(`Response status: ${response.status}`);
    console.log('Response data:', responseData);
    
    if (response.ok) {
      console.log('\nWebhook test successful!');
      console.log('The webhook received and processed the event.');
      
      if (responseData.result && responseData.result.orderId) {
        console.log(`Created order ID: ${responseData.result.orderId}`);
      }
    } else {
      console.error('\nWebhook test failed!');
      console.error('The webhook returned an error.');
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
}

// Run the test
testWebhook(); 