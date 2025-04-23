-- Create a temporary table to store the existing data
CREATE TEMP TABLE temp_order_packs AS
SELECT * FROM order_pack_lists;

-- Drop existing foreign key constraints
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_pack_list_id_fkey;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS handle_order_pack_type_trigger ON order_pack_lists;

-- Drop existing functions if any
DROP FUNCTION IF EXISTS handle_new_order_pack_type();
DROP FUNCTION IF EXISTS create_order_pack_type_value(text);

-- Recreate the table with TEXT type
ALTER TABLE order_pack_lists
    ALTER COLUMN value TYPE TEXT USING value::TEXT;

-- Add new values to the existing data
INSERT INTO order_pack_lists (value, label, weight, height, width, length, comment)
VALUES ('R1', 'R1', 1.000, 20.00, 15.00, 10.00, NULL)
ON CONFLICT (value) DO NOTHING;

-- Set invalid foreign keys to NULL before adding the constraint (REVISED LOGIC)
UPDATE public.orders o
SET order_pack_list_id = NULL
WHERE 
    -- Condition 1: The column is not NULL
    o.order_pack_list_id IS NOT NULL 
    AND 
    (
        -- Condition 2a: The text value IS NOT a valid UUID format
        NOT o.order_pack_list_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        OR
        -- Condition 2b: The text value IS a valid UUID format BUT doesn't exist in order_pack_lists
        (
            o.order_pack_list_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            AND NOT EXISTS (
                SELECT 1 
                FROM public.order_pack_lists opl 
                WHERE opl.id = o.order_pack_list_id::uuid -- Cast only if format is valid
            )
        )
    );

-- Additionally, ensure the column type IS UUID before adding constraint
ALTER TABLE public.orders ALTER COLUMN order_pack_list_id TYPE UUID USING order_pack_list_id::uuid;
-- This ALTER might fail if invalid UUIDs remain after UPDATE, but hopefully not.

-- Recreate the foreign key constraint
ALTER TABLE orders 
    ADD CONSTRAINT orders_order_pack_list_id_fkey 
    FOREIGN KEY (order_pack_list_id) 
    REFERENCES order_pack_lists(id);

-- Add comment to explain the changes
COMMENT ON COLUMN order_pack_lists.value IS 'Order pack type identifier (free-form text)'; 