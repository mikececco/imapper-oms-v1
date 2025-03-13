-- Add important column to orders table
ALTER TABLE orders ADD COLUMN important BOOLEAN DEFAULT FALSE;

-- Add comment to the column
COMMENT ON COLUMN orders.important IS 'Flag to mark orders as important';

-- Update existing rows to have false as default value
UPDATE orders SET important = FALSE WHERE important IS NULL;

-- Add 'order_update' to order_activity_type enum if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type 
                   WHERE typname = 'order_activity_type' 
                   AND typarray = 'order_activity_type[]'::regtype) THEN
        CREATE TYPE order_activity_type AS ENUM (
            'payment_status',
            'shipping_status',
            'order_status',
            'order_update'
        );
    ELSE
        ALTER TYPE order_activity_type ADD VALUE IF NOT EXISTS 'order_update';
    END IF;
END $$; 