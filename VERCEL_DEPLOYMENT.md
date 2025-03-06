# Vercel Deployment Guide

This guide explains how to deploy your Order Management System to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. A Supabase project with the necessary tables set up
4. A Stripe account for payment processing

## Application Structure

The Order Management System has a simplified structure for consistency across environments:

- **Dashboard**: The main entry point that displays a table of recent orders
- **Orders Page**: A complete list of all orders with filtering options
- **New Order Page**: Form to create new orders manually
- **Order Detail Page**: View and manage individual orders

The home page automatically redirects to the dashboard for a consistent user experience in both production and development environments.

## Ensuring Consistent Rendering

To ensure the application looks and behaves the same in both development and production environments:

1. **Error Handling**: All data fetching includes robust error handling to prevent crashes
2. **Date Formatting**: Dates are formatted consistently using the same locale settings
3. **Font Loading**: Fonts use the `display: swap` strategy to prevent layout shifts
4. **Environment Variables**: The same environment variables are used in all environments
5. **Responsive Design**: The application uses a mobile-first approach with consistent breakpoints

If you notice any differences between environments, check:
- That all environment variables are correctly set in Vercel
- That the Supabase connection is working properly
- That the database schema is identical in both environments

## Setting Up Environment Variables

Before deploying, you need to set up environment variables in Vercel:

1. Go to your Vercel dashboard
2. Click on "Add New" → "Project"
3. Import your Git repository
4. After the initial deployment, go to your project settings
5. Navigate to "Environment Variables"
6. Add the following environment variables:
   - `NEXT_SUPABASE_URL` - Your Supabase URL (from Supabase dashboard > Settings > API)
   - `NEXT_SUPABASE_ANON_KEY` - Your Supabase anonymous key (from Supabase dashboard > Settings > API)
   - `NEXT_PUBLIC_API_URL` - The URL of your API server (if separate from the Next.js app)
   - `STRIPE_SECRET_KEY` - Your Stripe secret key (from Stripe dashboard > Developers > API keys)
   - `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook signing secret (see Stripe Webhook Configuration below)
7. Make sure to set these variables for all environments (Production, Preview, and Development)
8. Click "Save" and redeploy your application

## Stripe Webhook Configuration

The application uses Stripe webhooks to process payments and create orders automatically. To set up webhooks:

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Developers > Webhooks
3. Click "Add endpoint"
4. Enter your webhook URL: `https://your-domain.com/api/webhook/stripe`
5. Select the following events to listen for:
   - `checkout.session.completed` - Creates an order when a checkout is completed
   - `payment_intent.succeeded` - Creates an order when a payment is successful
   - `customer.created` - Creates an order when a customer is created (if metadata includes create_order=true)
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.finalized`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Click "Add endpoint"
7. After creating the endpoint, you'll see a signing secret. Copy this value and add it as the `STRIPE_WEBHOOK_SECRET` environment variable in Vercel.

### Order Creation from Stripe Events

The system automatically creates orders from Stripe events:

1. **Checkout Session Completed**: When a customer completes checkout, an order is created with:
   - Customer details from the session
   - Shipping information if provided
   - Payment marked as completed

2. **Payment Intent Succeeded**: When a payment succeeds, an order is created with:
   - Customer details from the payment intent
   - Shipping information if provided
   - Payment marked as completed

3. **Customer Created**: When a customer is created with specific metadata:
   - Only creates an order if `create_order: 'true'` is in the metadata
   - Uses customer information to populate the order
   - Additional order details can be included in metadata (package, notes)

To include additional information in orders, add metadata to your Stripe objects:
- `package`: The order package type
- `notes`: Any special instructions for the order
- `create_order`: Set to 'true' to create an order from a customer object

### Testing Webhooks Locally

To test webhooks during development:

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Run `stripe login` to authenticate
3. Start your local server
4. Run `stripe listen --forward-to http://localhost:3000/api/webhook/stripe`
5. In another terminal, trigger test events with commands like:
   ```
   stripe trigger checkout.session.completed
   stripe trigger payment_intent.succeeded
   stripe trigger customer.created
   ```

Alternatively, you can use the included test script:

1. Make sure your local server is running
2. Install the required dependencies:
   ```
   npm install node-fetch
   ```
3. Run the test script with:
   ```
   node app/utils/test_stripe_webhook.js [eventType]
   ```
   
   Where `[eventType]` is one of:
   - `checkoutSessionCompleted` (default)
   - `paymentIntentSucceeded`
   - `customerCreated`

4. Check your server logs to see the webhook processing and order creation

The test script simulates Stripe webhook events with realistic data and proper signature verification, making it easier to test the order creation process without needing a real Stripe account.

### Troubleshooting Webhook Issues

If you encounter a 405 (Method Not Allowed) error:

1. Ensure your webhook endpoint is properly configured to accept POST requests
2. Check that the route is correctly defined in your `vercel.json` file
3. Verify that your API route is exporting a POST function
4. Make sure CORS headers are properly set for the webhook endpoint
5. Test with the Stripe CLI to see detailed error messages

## Stripe Webhook Configuration

The application uses Stripe webhooks to process customer creation events. To set up webhooks:

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Developers > Webhooks
3. Click "Add endpoint"
4. Enter your webhook URL: `https://your-domain.com/api/webhook/stripe`
5. Select only the following event to listen for:
   - `customer.created`
6. Click "Add endpoint"
7. After creating the endpoint, you'll see a signing secret. Copy this value and add it as the `STRIPE_WEBHOOK_SECRET` environment variable in Vercel.

### Testing Webhooks Locally

To test webhooks during development:

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Run `stripe login` to authenticate
3. Start your local server
4. Run `stripe listen --forward-to http://localhost:3000/api/webhook/stripe`
5. In another terminal, trigger a test event with:
   ```
   stripe trigger customer.created
   ```
6. Alternatively, you can use the test script provided:
   ```
   node src/utils/test_customer_webhook.js
   ```

### Troubleshooting Webhook Issues

If you encounter a 405 (Method Not Allowed) error:

1. Ensure your webhook endpoint is properly configured to accept POST requests
2. Check that the route is correctly defined in your `vercel.json` file
3. Verify that your API route is exporting a POST function
4. Make sure CORS headers are properly set for the webhook endpoint
5. Test with the Stripe CLI to see detailed error messages

## Database Setup

Before your application will work correctly, you need to set up the database tables in Supabase. There are two ways to do this:

### Option 1: Using the Migration Script (Recommended)

1. Make sure your `.env.development` file contains the following variables:
   ```
   NEXT_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   
   > **Important**: You need the **Service Role Key** (not the anon key) to run migrations. You can find it in your Supabase dashboard under Project Settings > API.

2. Run the migration script:
   ```bash
   node app/utils/push_migration.js
   ```
   
   This script will:
   - Set up the required SQL functions in Supabase
   - Run all SQL migration files in the `migrations` directory
   - Provide detailed output about the migration process
   
3. To run a specific migration file only:
   ```bash
   node app/utils/push_migration.js stripe_events_table.sql
   ```

### Option 2: Using the Supabase Dashboard

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the following database migration scripts:
   - `migrations/orders_table.sql` - Creates the orders table for storing order information
   - `migrations/stripe_events_table.sql` - Creates the stripe_events table for storing Stripe webhook events
4. Verify that the tables have been created correctly by checking the Table Editor

The migration scripts will:
- Create the necessary tables if they don't exist
- Set up appropriate indexes for performance
- Configure default values and constraints

### Orders Table

The `orders` table stores all order information, including:
- Customer details (name, email, phone)
- Shipping address
- Order package and notes
- Status information (pending, shipped, delivered, etc.)
- Payment status (is_paid)
- Shipping status (ok_to_ship)
- Creation and update timestamps

### Stripe Events Table

The `stripe_events` table stores all incoming Stripe webhook events, including:
- Event ID and type
- Complete event data as JSON
- Processing status
- Creation and processing timestamps

This table helps with:
- Auditing webhook events
- Debugging webhook processing issues
- Preventing duplicate event processing
- Tracking event history

For more detailed instructions, see the [Database Migration Guide](src/utils/MIGRATION_README.md).

## Deployment

### Option 1: Automatic Deployment

1. Connect your Git repository to Vercel
2. Vercel will automatically deploy your application when you push changes to your repository

### Option 2: Manual Deployment

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Login to Vercel:
   ```
   vercel login
   ```

3. Deploy your project:
   ```
   vercel
   ```

## Vercel Configuration

The `vercel.json` file in your project contains the configuration for your Vercel deployment:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["cdg1"],
  "routes": [
    {
      "src": "/api/webhook/stripe",
      "methods": ["POST"],
      "dest": "/api/webhook/stripe",
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, stripe-signature"
      }
    },
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

Note that the `buildCommand` is set to `npm run build`, which corresponds to the build script in your `package.json` file.

## CSS Configuration

This project uses a simple CSS approach with a single stylesheet:

- `app/styles.css`: Contains all the styling for the application, including:
  - Basic typography and colors
  - Layout utilities
  - Component styles (buttons, cards, forms, tables)

This approach avoids dependencies on CSS frameworks like Tailwind CSS, making the build process simpler and more reliable.

## API Server Deployment

If your API server is separate from your Next.js app, you'll need to deploy it separately. Options include:

1. Vercel Serverless Functions
2. Heroku
3. Railway
4. Render
5. AWS, GCP, or Azure

Make sure to update the `NEXT_PUBLIC_API_URL` environment variable with the URL of your deployed API server.

## Troubleshooting

If you encounter issues with your deployment:

1. Check the Vercel deployment logs
2. Ensure all environment variables are correctly set in the Vercel dashboard
3. Verify that your API server is accessible from your Next.js app
4. Check that your Supabase configuration is correct
5. If you see "Environment Variable references Secret which does not exist" errors, make sure you've added the environment variables directly in the Vercel dashboard

### Common Build Errors

1. **CSS Framework Issues**:
   - If you encounter CSS-related build errors, consider using a simpler approach without CSS frameworks
   - The current setup uses plain CSS without dependencies on Tailwind CSS or other frameworks

2. **Invalid Next.js configuration**:
   - Error: `Invalid next.config.js options detected: Unrecognized key(s) in object: 'swcMinify'`
   - Solution: Remove the `swcMinify` option from your next.config.js file as it's no longer supported in Next.js 15.
   
3. **JavaScript vs TypeScript**:
   - The project has been converted from TypeScript to JavaScript to simplify development and avoid type-related errors
   - All files now use .js and .jsx extensions instead of .ts and .tsx
   - If you prefer TypeScript, you'll need to add type definitions and convert files back to TypeScript

4. **Supabase Connection Issues**:
   - Error: "Missing Supabase environment variables" or "Error fetching data from Supabase"
   - Solution: Make sure your Supabase URL and anon key are correctly set in the Vercel environment variables
   - Check that your database tables are set up correctly according to the migration script

5. **Stripe API Key Issues**:
   - Error: "Invalid API Key provided" or "Authentication failed"
   - Solution: Ensure your Stripe secret key is correctly set in the environment variables
   - Make sure you're using the correct key for your environment (test key for development, live key for production)

6. **Webhook Signature Verification Failed**:
   - Error: "Webhook signature verification failed"
   - Solution: Check that your `STRIPE_WEBHOOK_SECRET` is correctly set
   - For local testing, make sure you're using the webhook secret provided by the Stripe CLI 