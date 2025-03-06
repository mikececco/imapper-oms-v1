-- Add shipping_method column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50) DEFAULT 'standard';

-- Update existing orders to have a default shipping method
UPDATE orders
SET shipping_method = 'standard'
WHERE shipping_method IS NULL;

-- Add comment to the column
COMMENT ON COLUMN orders.shipping_method IS 'Shipping method for SendCloud (standard, express, priority, economy)'; 