-- Add important column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS important BOOLEAN DEFAULT FALSE;

-- Add comment to the column
COMMENT ON COLUMN orders.important IS 'Flag to mark orders as important';

-- Update existing rows to have false as default value
UPDATE orders SET important = FALSE WHERE important IS NULL;

-- Add 'order_update' to order_activity_type enum if it doesn't exist (REVISED BLOCK)
DO $$
BEGIN
    -- Check if the base enum type exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_activity_type') THEN
        -- If it exists, add the value if it's not already there
        ALTER TYPE order_activity_type ADD VALUE IF NOT EXISTS 'order_update';
    ELSE
        -- If it doesn't exist, create the type including the new value
        CREATE TYPE order_activity_type AS ENUM (
            'payment_status',
            'shipping_status',
            'order_status',
            'order_update'
            -- If the original CREATE TYPE migration had other values, list them here too
        );
    END IF;
END $$;

-- Optional: Add an index if you plan to query this column often
CREATE INDEX IF NOT EXISTS idx_orders_important ON orders (important); 