-- Add order_pack_quantity column to orders table
ALTER TABLE orders ADD COLUMN order_pack_quantity INTEGER NOT NULL DEFAULT 1;

-- Update existing rows to have a quantity of 1
UPDATE orders SET order_pack_quantity = 1 WHERE order_pack_quantity IS NULL; 