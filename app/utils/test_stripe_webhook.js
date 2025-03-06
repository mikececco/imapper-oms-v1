/**
 * Test script to simulate Stripe webhook events
 * 
 * Usage:
 * 1. Make sure your local server is running
 * 2. Run this script with: node app/utils/test_stripe_webhook.js [eventType] [webhookSecret]
 *    Example: node app/utils/test_stripe_webhook.js customerCreated whsec_your_webhook_secret
 * 3. Check your server logs to see the webhook processing
 */

import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { argv } from 'process';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.development
dotenv.config({ path: resolve(__dirname, '../../.env.development') });

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5000/api/webhook/stripe';
// Get webhook secret from command line args, environment variable, or use default
const WEBHOOK_SECRET = argv[3] || process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';

// Sample events
const events = {
  // Checkout session completed event
  checkoutSessionCompleted: {
    id: `evt_${Date.now()}_checkout`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_${Date.now()}`,
        object: 'checkout.session',
        customer_details: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1234567890'
        },
        shipping: {
          name: 'Test Customer',
          phone: '+1234567890',
          address: {
            line1: '123 Test Street',
            line2: 'Apt 4',
            city: 'Test City',
            state: 'Test State',
            postal_code: '12345',
            country: 'US'
          }
        },
        metadata: {
          package: 'Premium Test Package',
          notes: 'This is a test order from the webhook test script'
        }
      }
    }
  },
  
  // Payment intent succeeded event
  paymentIntentSucceeded: {
    id: `evt_${Date.now()}_payment`,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: `pi_${Date.now()}`,
        object: 'payment_intent',
        receipt_email: 'payment@example.com',
        shipping: {
          name: 'Payment Customer',
          phone: '+0987654321',
          address: {
            line1: '456 Payment Street',
            city: 'Payment City',
            state: 'Payment State',
            postal_code: '54321',
            country: 'US'
          }
        },
        metadata: {
          package: 'Standard Test Package',
          notes: 'This is a test payment from the webhook test script'
        }
      }
    }
  },
  
  // Customer created event
  customerCreated: {
    id: `evt_${Date.now()}_customer`,
    type: 'customer.created',
    data: {
      object: {
        id: `cus_${Date.now()}`,
        object: 'customer',
        name: 'New Customer',
        email: 'new@example.com',
        phone: '+1122334455',
        metadata: {
          create_order: 'true',
          package: 'Basic Test Package',
          notes: 'This is a test customer from the webhook test script'
        }
      }
    }
  }
};

// Function to sign the payload
function generateSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return {
    timestamp,
    signature,
    signedHeader: `t=${timestamp},v1=${signature}`
  };
}

// Function to send a test webhook
async function sendTestWebhook(eventType) {
  if (!events[eventType]) {
    console.error(`Unknown event type: ${eventType}`);
    console.error(`Available event types: ${Object.keys(events).join(', ')}`);
    return;
  }
  
  const event = events[eventType];
  const payload = JSON.stringify(event);
  const { signedHeader } = generateSignature(payload, WEBHOOK_SECRET);
  
  try {
    console.log(`Sending ${eventType} event to ${WEBHOOK_URL}...`);
    console.log(`Using webhook secret: ${WEBHOOK_SECRET.substring(0, 5)}...`);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signedHeader
      },
      body: payload
    });
    
    // Clone the response before trying to read it
    const responseStatus = response.status;
    let responseData;
    
    if (responseStatus === 204) {
      responseData = 'No Content';
    } else {
      try {
        // Clone the response to avoid the "body used already" error
        const responseClone = response.clone();
        responseData = await responseClone.json();
      } catch (e) {
        try {
          responseData = await response.text();
        } catch (textError) {
          responseData = `Could not parse response: ${textError.message}`;
        }
      }
    }
    
    console.log(`Response status: ${responseStatus}`);
    console.log('Response data:', responseData);
    
    if (response.ok) {
      console.log(`Successfully sent ${eventType} event!`);
    } else {
      console.error(`Failed to send ${eventType} event.`);
      console.error('If you see a signature verification error, make sure to:');
      console.error('1. Pass the correct webhook secret as the second argument');
      console.error('2. Set STRIPE_WEBHOOK_SECRET in your .env.development file');
      console.error('3. Make sure the secret matches what your server expects');
    }
  } catch (error) {
    console.error('Error sending webhook:', error);
  }
}

// Main function
async function main() {
  const eventType = argv[2] || 'checkoutSessionCompleted';
  
  console.log('Stripe Webhook Test Script');
  console.log('=========================');
  console.log(`Testing event: ${eventType}`);
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Webhook Secret: ${WEBHOOK_SECRET.substring(0, 5)}...`);
  
  await sendTestWebhook(eventType);
}

// Run the script
main().catch(console.error); 