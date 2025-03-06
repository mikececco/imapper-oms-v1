-- Add last_delivery_status_check column to the orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_delivery_status_check TIMESTAMP WITH TIME ZONE;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_last_delivery_status_check ON orders(last_delivery_status_check);

-- Add comment to explain the column
COMMENT ON COLUMN orders.last_delivery_status_check IS 'Timestamp of the last time the delivery status was checked from SendCloud API'; 