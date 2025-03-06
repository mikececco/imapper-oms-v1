-- Add shipping_instruction column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_instruction TEXT;
COMMENT ON COLUMN orders.shipping_instruction IS 'Shipping instruction for the order';

-- Add shipping label fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_link TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_url TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_link ON orders(tracking_link);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);

-- Add comment to explain the fields
COMMENT ON COLUMN orders.tracking_link IS 'URL for tracking the shipment';
COMMENT ON COLUMN orders.tracking_number IS 'Tracking number for the shipment';
COMMENT ON COLUMN orders.label_url IS 'URL to the shipping label PDF';

-- Only update shipping instruction if both tracking_link and shipping_instruction columns exist
DO $$
BEGIN
    -- First check if shipping_instruction column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'shipping_instruction'
    ) THEN
        -- Then check if tracking_link column exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'orders' 
            AND column_name = 'tracking_link'
        ) THEN
            -- Update existing orders with shipping instruction if they have a tracking link but no shipping instruction
            UPDATE orders 
            SET shipping_instruction = 'SHIPPED' 
            WHERE tracking_link IS NOT NULL 
              AND (shipping_instruction IS NULL OR shipping_instruction = '');
        END IF;
    END IF;
END $$; 