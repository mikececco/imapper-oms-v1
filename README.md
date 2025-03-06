# Order Management System

A Next.js application for managing orders with Supabase integration.

## Project Structure

This project uses the Next.js App Router structure:

```
/app                  # Main application directory
  /api                # API routes
    /webhook          # Webhook endpoints
      /stripe         # Stripe webhook handler
    /orders           # Order-related API endpoints
      /update-delivery-status # Endpoint to update delivery status
    /scheduled-tasks  # Scheduled tasks API endpoint
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
    sendcloud.js      # SendCloud API integration
    scheduled-tasks.js # Scheduled tasks for automation
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
- Automated delivery tracking with SendCloud integration
- Shipping instruction system based on order status, payment, and tracking

## Environment Variables

- `NEXT_SUPABASE_URL`: Your Supabase URL
- `NEXT_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret
- `SENDCLOUD_API_KEY`: Your SendCloud API key
- `SENDCLOUD_API_SECRET`: Your SendCloud API secret

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

3. To set up delivery tracking fields, run:
   ```bash
   node app/utils/run_delivery_tracking_migration.js
   ```

## Delivery Tracking

The system includes automated delivery tracking with SendCloud integration:

1. Orders with tracking links are automatically checked for delivery status
2. The shipping instruction field is automatically updated based on:
   - Delivery status (from SendCloud)
   - Payment status
   - Tracking link validity

Shipping instructions include:
- DELIVERED: Order has been delivered
- SHIPPED: Order has been shipped and is in transit
- TO BE SHIPPED BUT NO STICKER: Order is ready to ship but needs a shipping label
- TO BE SHIPPED BUT WRONG TRACKING LINK: Order is ready to ship but has an invalid tracking link
- TO SHIP: Order is ready to be shipped
- DO NOT SHIP: Order should not be shipped (payment issues)
- UNKNOWN: Status cannot be determined

## Scheduled Tasks

The system includes scheduled tasks for automation:

1. To update delivery statuses for all orders with tracking links:
   ```
   curl -X POST http://localhost:3000/api/scheduled-tasks?task=delivery-status
   ```

2. To run all scheduled tasks:
   ```
   curl -X POST http://localhost:3000/api/scheduled-tasks
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
