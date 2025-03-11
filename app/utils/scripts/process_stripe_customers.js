#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

// Import the processing function
const { processLastCustomerEvents } = require('../process_stripe_customers');

// Get the limit from command line arguments
const limit = process.argv[2] ? parseInt(process.argv[2]) : 100;

console.log(`Starting to process the last ${limit} Stripe customer.created events...`);

// Process events
processLastCustomerEvents(limit)
  .then(result => {
    if (result.success) {
      console.log('Script completed successfully');
      console.log(`Processed ${result.processed} events, created ${result.successful} orders`);
    } else {
      console.error('Script failed:', result.error);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 