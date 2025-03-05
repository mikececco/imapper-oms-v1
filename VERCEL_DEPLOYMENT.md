# Vercel Deployment Guide

This guide explains how to deploy your Order Management System to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. A Supabase project with the necessary tables set up
4. A Stripe account for payment processing

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

The application uses Stripe webhooks to process payments and create orders. To set up webhooks:

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Developers > Webhooks
3. Click "Add endpoint"
4. Enter your webhook URL: `https://your-domain.com/api/webhook/stripe`
5. Select the following events to listen for:
   - `invoice.created`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.finalized`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Click "Add endpoint"
7. After creating the endpoint, you'll see a signing secret. Copy this value and add it as the `STRIPE_WEBHOOK_SECRET` environment variable in Vercel.

### Testing Webhooks Locally

To test webhooks during development:

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Run `stripe login` to authenticate
3. Start your local server
4. Run `stripe listen --forward-to http://localhost:5000/api/webhook/stripe`
5. In another terminal, trigger test events with commands like:
   ```
   stripe trigger invoice.created
   stripe trigger payment_intent.succeeded
   ```

## Database Setup

Before your application will work correctly, you need to set up the database tables in Supabase:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the database migration script from `src/utils/database_migration.sql`
4. Verify that the tables have been created correctly

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
  "buildCommand": "npm run build:next",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["cdg1"],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

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
   - Error: `Invalid next.config.ts options detected: Unrecognized key(s) in object: 'swcMinify'`
   - Solution: Remove the `swcMinify` option from your next.config.ts file as it's no longer supported in Next.js 15.

3. **Supabase Connection Issues**:
   - Error: "Missing Supabase environment variables" or "Error fetching data from Supabase"
   - Solution: Make sure your Supabase URL and anon key are correctly set in the Vercel environment variables
   - Check that your database tables are set up correctly according to the migration script

4. **Stripe API Key Issues**:
   - Error: "Invalid API Key provided" or "Authentication failed"
   - Solution: Ensure your Stripe secret key is correctly set in the environment variables
   - Make sure you're using the correct key for your environment (test key for development, live key for production)

5. **Webhook Signature Verification Failed**:
   - Error: "Webhook signature verification failed"
   - Solution: Check that your `STRIPE_WEBHOOK_SECRET` is correctly set
   - For local testing, make sure you're using the webhook secret provided by the Stripe CLI 