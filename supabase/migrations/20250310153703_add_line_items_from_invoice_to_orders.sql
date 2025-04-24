-- Migration to add line_items column (intended as JSONB) and index it

-- Add line_items column if it doesn't exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS line_items TEXT; -- Add as TEXT initially if it might exist as such

-- Ensure the column type is JSONB before creating the GIN index
ALTER TABLE public.orders
ALTER COLUMN line_items TYPE JSONB USING line_items::text::jsonb;
-- Note: Assumes existing text data is valid JSON or NULL.

-- Add a comment to the column
COMMENT ON COLUMN public.orders.line_items IS 'Stores line item details extracted from Stripe Invoice, as JSONB';

-- Create an index on the line_items column for better performance when querying JSONB data
CREATE INDEX IF NOT EXISTS idx_orders_line_items ON public.orders USING GIN (line_items);

-- Function to backfill line_items (example, adjust as needed)
-- ... (Keep CREATE FUNCTION IF EXISTS backfill_line_items_from_invoice) ...

-- Call the function to backfill data
-- ... (Keep SELECT backfill_line_items_from_invoice()) ...

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