-- Remove the instruction column from orders table
ALTER TABLE orders DROP COLUMN IF EXISTS instruction;

-- Drop the update_order_instruction function as it's no longer needed
DROP FUNCTION IF EXISTS public.update_order_instruction(order_id INTEGER); 