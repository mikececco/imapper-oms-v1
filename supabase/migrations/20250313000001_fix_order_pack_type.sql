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

-- Recreate the foreign key constraint
ALTER TABLE orders
    ADD CONSTRAINT orders_order_pack_list_id_fkey
    FOREIGN KEY (order_pack_list_id)
    REFERENCES order_pack_lists(id);

-- Add comment to explain the changes
COMMENT ON COLUMN order_pack_lists.value IS 'Order pack type identifier (free-form text)'; 