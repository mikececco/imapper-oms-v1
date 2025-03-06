# Order Management System

A Next.js application for managing orders with Supabase integration.

## Project Structure

This project uses the Next.js App Router structure:

```
/app                  # Main application directory
  /api                # API routes
    /webhook          # Webhook endpoints
      /stripe         # Stripe webhook handler
  /components         # React components
    Navigation.jsx    # Navigation component
    NewOrderForm.jsx  # Form for creating new orders
    OrderActions.jsx  # Order action components (status, payment, shipping)
    OrderDetailForm.jsx # Form for editing order details
    OrderSearch.jsx   # Search component for orders
  /dashboard          # Dashboard page
  /orders             # Orders pages
    /[id]             # Order detail page
    /new              # New order page
  /utils              # Utility functions and helpers
    /migrations       # SQL migration files
    constants.js      # Application constants
    push_migration.js # Script to push migrations to Supabase
    run_migration.js  # Script to run migrations
    supabase.js       # Supabase client and helper functions
    verify_schema.js  # Script to verify database schema
    verify_stripe_config.js # Script to verify Stripe configuration
  layout.jsx          # Root layout component
  page.jsx            # Home page (redirects to dashboard)
  styles.css          # Global styles
/migrations           # Migration files for database setup
/public               # Static assets
/supabase             # Supabase migrations
  /migrations         # Supabase migration files
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.development` to `.env.local`
   - Update the values as needed
4. Run the development server:
   ```
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- Dashboard with order statistics and recent activity
- Order management (create, view, update)
- Stripe integration for payment processing
- Supabase database integration

## Environment Variables

- `NEXT_SUPABASE_URL`: Your Supabase URL
- `NEXT_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret

## Database Setup

Before your application will work correctly, you need to set up the database tables in Supabase:

1. Make sure your `.env.development` file contains the following variables:
   ```
   NEXT_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Run the migration script:
   ```bash
   node app/utils/push_migration.js
   ```

## Stripe Webhook Setup

The application uses Stripe webhooks to process customer creation events:

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Developers > Webhooks
3. Add an endpoint with your webhook URL: `https://your-domain.com/api/webhook/stripe`
4. Select the `customer.created` event to listen for
5. Add the webhook signing secret to your environment variables as `STRIPE_WEBHOOK_SECRET`

## Deployment

This project is configured for deployment on Vercel. See `VERCEL_DEPLOYMENT.md` for more details.
