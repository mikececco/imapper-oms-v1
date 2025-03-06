-- Migration: Add order_notes column
-- Description: This migration adds the order_notes column to the orders table

-- Add order_notes column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_notes TEXT;

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_orders_order_notes ON orders(order_notes);

-- Check the actual column names in the orders table
DO $$
DECLARE
    col RECORD;
BEGIN
    -- List all columns in the orders table
    RAISE NOTICE 'Columns in orders table:';
    FOR col IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '%', col.column_name;
    END LOOP;
    
    -- Check if customers table exists
    PERFORM 1 FROM information_schema.tables WHERE table_name = 'customers';
    IF NOT FOUND THEN
        RAISE NOTICE 'customers table does not exist';
    ELSE
        RAISE NOTICE 'customers table exists';
        
        -- List columns in customers table
        RAISE NOTICE 'Columns in customers table:';
        FOR col IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'customers'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '%', col.column_name;
        END LOOP;
    END IF;
END $$; 