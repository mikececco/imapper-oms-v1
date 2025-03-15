-- Remove the shipping_instruction column from the orders table
-- since it's not being used and all values are NULL

-- First check if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'shipping_instruction'
  ) THEN
    -- Remove the column if it exists
    ALTER TABLE orders DROP COLUMN IF EXISTS shipping_instruction;
    RAISE NOTICE 'Removed shipping_instruction column from orders table';
  ELSE
    RAISE NOTICE 'shipping_instruction column does not exist in orders table';
  END IF;
END $$; 