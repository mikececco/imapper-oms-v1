-- Migration: Add weight column to orders table
-- Description: This migration adds a weight column to the orders table for SendCloud shipping labels

-- Add weight column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight TEXT DEFAULT '1.000';

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_orders_weight ON orders(weight);

-- Update existing orders to have a default weight if it's NULL
UPDATE orders SET weight = '1.000' WHERE weight IS NULL;

-- Log the migration
DO $$
DECLARE
    col RECORD;
BEGIN
    RAISE NOTICE 'Migration 20250306133834_add_weight_column completed successfully';
    
    -- List all columns in the orders table to verify
    RAISE NOTICE 'Columns in orders table:';
    FOR col IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '%', col.column_name;
    END LOOP;
END $$; 