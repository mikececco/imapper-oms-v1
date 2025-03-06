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
  /dashboard          # Dashboard page
  /orders             # Orders pages
    /[id]             # Order detail page
    /new              # New order page
  /utils              # Utility functions and helpers
    /migrations       # SQL migration files
  layout.jsx          # Root layout component
  page.jsx            # Home page (redirects to dashboard)
  styles.css          # Global styles
/public               # Static assets
/supabase             # Supabase migrations
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

## Deployment

This project is configured for deployment on Vercel. See `VERCEL_DEPLOYMENT.md` for more details.
