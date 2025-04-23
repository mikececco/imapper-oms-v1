-- Add the became_to_ship_at column to track when an order status allows shipping
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS became_to_ship_at TIMESTAMPTZ NULL;

-- Add a comment to explain the column's purpose
COMMENT ON COLUMN public.orders.became_to_ship_at 
IS 'Timestamp indicating when the order first met the criteria to be shipped (e.g., paid=true, ok_to_ship=true, status=pending).';

-- Optional: Add an index if you frequently query or sort by this column
CREATE INDEX IF NOT EXISTS idx_orders_became_to_ship_at ON public.orders(became_to_ship_at);