-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address TEXT,
  order_pack TEXT,
  order_notes TEXT,
  weight TEXT DEFAULT '1.000',
  status TEXT DEFAULT 'pending',
  is_paid BOOLEAN DEFAULT false,
  ok_to_ship BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add weight column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight TEXT DEFAULT '1.000';

-- Create index on customer_name for faster searches
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Sample data for testing (uncomment to use)
/*
INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_address, order_pack, order_notes, status, is_paid, ok_to_ship)
VALUES
  ('John Doe', 'john@example.com', '+1234567890', '123 Main St, City, Country', 'Standard Pack', 'Please deliver before noon', 'pending', false, false),
  ('Jane Smith', 'jane@example.com', '+0987654321', '456 Oak Ave, Town, Country', 'Premium Pack', 'Fragile items inside', 'shipped', true, true),
  ('Robert Johnson', 'robert@example.com', '+1122334455', '789 Pine Rd, Village, Country', 'Basic Pack', 'Leave at the door', 'delivered', true, true),
  ('Sarah Williams', 'sarah@example.com', '+5566778899', '321 Elm St, Suburb, Country', 'Custom Pack', 'Call before delivery', 'pending', true, false),
  ('Michael Brown', 'michael@example.com', '+2233445566', '654 Maple Dr, City, Country', 'Standard Pack', 'No special instructions', 'cancelled', false, false);
*/ 