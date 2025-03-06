-- Add order_notes column to the orders table if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_notes TEXT;

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_orders_order_notes ON orders(order_notes);

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Added order_notes column to orders table';
END $$; 