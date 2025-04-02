-- Add manual_instruction column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS manual_instruction TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN orders.manual_instruction IS 'Manually set instruction, overrides calculated instruction if not NULL.';

-- Optional: Add index if you expect to query this often
-- CREATE INDEX IF NOT EXISTS idx_orders_manual_instruction ON orders(manual_instruction);