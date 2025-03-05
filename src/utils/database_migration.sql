-- Add new columns to the orders table for Stripe webhook data
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_city TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_country TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_postal_code TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_email TEXT,
  description TEXT,
  status TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_invoice_id ON orders(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_customer_id ON orders(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id); 