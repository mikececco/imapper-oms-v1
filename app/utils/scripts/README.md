# Stripe Customer Processing Scripts

This directory contains utility scripts for processing Stripe events.

## Process Stripe Customers

The `process_stripe_customers.js` script fetches the last 100 Stripe `customer.created` events and processes them through the same flow as the webhook handler. This is useful for backfilling orders from customers that were created before the webhook was set up or for reprocessing events that failed.

### Prerequisites

- Node.js 14+
- Environment variables set up in a `.env` file at the project root:
  - `STRIPE_SECRET_KEY`: Your Stripe secret key
  - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
  - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### Usage

```bash
# Process the last 100 customer.created events
node app/utils/scripts/process_stripe_customers.js

# Process a specific number of events (e.g., 50)
node app/utils/scripts/process_stripe_customers.js 50
```

### What the script does

1. Fetches the last N `customer.created` events from Stripe
2. Checks if each event has already been processed (by looking in the `stripe_events` table)
3. For each unprocessed event:
   - Creates or updates the customer in the database
   - Checks if the customer has any paid invoices with an amount > 300 euros
   - If an eligible invoice is found, creates an order for the customer
   - Marks the event as processed

### Output

The script provides detailed logs of its progress and a summary at the end:

```
--- Processing Summary ---
Total events found: 100
Events processed: 75
Events skipped (already processed): 25
Successful order creations: 50
Errors: 5
```

## Troubleshooting

If you encounter errors:

1. Check that your environment variables are correctly set
2. Verify that you have the necessary permissions in Stripe and Supabase
3. Look for specific error messages in the console output
4. Check the Stripe dashboard for event details

For invoice-related issues, remember that only customers with paid invoices exceeding 300 euros will have orders created. 