require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`
});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createTestCustomer() {
  try {
    console.log('Creating a test customer in Stripe...');
    
    // Create a test customer
    const customer = await stripe.customers.create({
      email: `test-${Date.now()}@example.com`,
      name: `Test Customer ${Date.now()}`,
      description: 'Test customer for webhook verification',
      metadata: {
        test: 'true',
        created_by: 'webhook_test_script'
      }
    });
    
    console.log(`Successfully created test customer with ID: ${customer.id}`);
    console.log(`This should trigger a customer.created webhook event.`);
    console.log(`Check your webhook logs to verify the event was received.`);
    
    return customer;
  } catch (error) {
    console.error('Error creating test customer:', error);
    throw error;
  }
}

// Run the test
createTestCustomer()
  .then(() => {
    console.log('Test completed successfully.');
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 