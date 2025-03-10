-- Add line_items column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS line_items JSONB;

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN orders.line_items IS 'JSON array of line items from Stripe invoice';

-- Create an index on the line_items column for better performance when querying
CREATE INDEX IF NOT EXISTS idx_orders_line_items ON orders USING GIN (line_items);

-- Function to update existing orders with line items from Stripe
CREATE OR REPLACE FUNCTION update_line_items_from_stripe()
RETURNS TABLE (
  order_id TEXT,
  invoice_id TEXT,
  line_items_count INTEGER
) AS $$
DECLARE
  r RECORD;
  line_items JSONB;
  line_items_count INTEGER;
BEGIN
  FOR r IN 
    SELECT id, stripe_invoice_id 
    FROM orders 
    WHERE stripe_invoice_id IS NOT NULL 
    AND line_items IS NULL
  LOOP
    -- This is a placeholder for actual API call logic
    -- In production, you would call the Stripe API here
    -- For now, we'll just set a placeholder value
    line_items := '[]'::JSONB;
    line_items_count := 0;
    
    -- Update the order with the line items
    UPDATE orders 
    SET line_items = line_items
    WHERE id = r.order_id;
    
    -- Return the updated order info
    order_id := r.id;
    invoice_id := r.stripe_invoice_id;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql; 