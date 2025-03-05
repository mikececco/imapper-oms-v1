-- SQL script to create the necessary tables if they don't exist
-- Run this in the Supabase SQL Editor

-- Create the orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  name TEXT,
  instruction TEXT,
  order_pack TEXT,
  package_prepared BOOLEAN DEFAULT FALSE,
  serial_number TEXT,
  package_weight TEXT,
  ship_by TIMESTAMP WITH TIME ZONE,
  paid BOOLEAN DEFAULT FALSE,
  ok_to_ship BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  email TEXT,
  phone TEXT,
  shipping_address_city TEXT,
  shipping_address_country TEXT,
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_address_postal_code TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_customer_id TEXT,
  amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the subscriptions table if it doesn't exist
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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_invoice_id ON orders(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_customer_id ON orders(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Insert a sample order for testing (optional)
INSERT INTO orders (
  id, name, instruction, order_pack, status, email, 
  shipping_address_city, created_at, updated_at
)
VALUES (
  'sample_order_1', 
  'Test Customer', 
  'Sample instruction', 
  'Sample product', 
  'pending',
  'test@example.com',
  'Sample City',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Confirm tables were created
SELECT 'Tables created successfully!' as result; 