-- Add house_number column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address_house_number TEXT NOT NULL DEFAULT '';

-- Add comment to explain the column
COMMENT ON COLUMN orders.shipping_address_house_number IS 'House number for shipping address';

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_orders_shipping_address_house_number ON orders(shipping_address_house_number);

-- Update existing orders to have a default value
UPDATE orders SET shipping_address_house_number = '' WHERE shipping_address_house_number IS NULL; 