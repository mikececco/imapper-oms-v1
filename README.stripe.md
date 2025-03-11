# Stripe Event Processing Script

This script fetches Stripe events and processes them through the same flow as the webhook handler. This is useful for backfilling orders from events that were created before the webhook was set up or for reprocessing events that failed.

## Prerequisites

- Node.js 14+
- Stripe API key
- Supabase credentials

## Setup

1. Copy the `.env.stripe.example` file to `.env.stripe`:
   ```bash
   cp .env.stripe.example .env.stripe
   ```

2. Edit the `.env.stripe` file and add your actual credentials:
   ```
   # Stripe API keys
   STRIPE_SECRET_KEY=sk_test_your_actual_stripe_secret_key
   
   # Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_actual_supabase_service_role_key
   ```

## Usage

```bash
# Process the last 100 customer.created events (default)
node process_stripe_customers.mjs customer.created 100

# Process invoice.paid events (with 300 euro filter)
node process_stripe_customers.mjs invoice.paid 50
```

The script accepts two arguments:
1. Event type: `customer.created` or `invoice.paid` (default: `customer.created`)
2. Limit: Number of events to process (default: 100)

## Event Processing

### customer.created events
- Creates or updates the customer in the database
- Creates an order for the customer (no invoice amount filter)
- Marks the event as processed

### invoice.paid events
- Only processes invoices with an amount > 300 euros
- Creates or updates the customer in the database
- Creates an order for the customer with the invoice details
- Marks the order as paid
- Marks the event as processed

## Output

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

1. Check that your environment variables are correctly set in the `.env.stripe` file
2. Verify that you have the necessary permissions in Stripe and Supabase
3. Look for specific error messages in the console output
4. Check the Stripe dashboard for event details

For invoice-related issues, remember that only `invoice.paid` events with paid amounts exceeding 300 euros will have orders created. There is no amount filter for `customer.created` events. 