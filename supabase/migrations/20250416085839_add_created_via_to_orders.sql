-- Add the new column to track order creation source
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS created_via TEXT DEFAULT 'standard';

-- Add a comment explaining the column's purpose
COMMENT ON COLUMN public.orders.created_via IS 'Indicates the source or context through which the order was created (e.g., standard, returns_portal).';

-- Optional: Update existing orders if you can identify them, otherwise the default 'standard' will apply.
-- Example: UPDATE public.orders SET created_via = 'unknown' WHERE created_via IS NULL;
