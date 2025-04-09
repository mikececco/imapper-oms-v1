    -- Migration: ensure_return_created_at_column
    -- Reason: Add the return_created_at column to the orders table if it doesn't exist.
    -- This column is required by the set_return_created_at_trigger.

    ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS return_created_at TIMESTAMPTZ;

    -- Optional: Add a comment to the column for clarity
    COMMENT ON COLUMN public.orders.return_created_at IS 'Timestamp indicating when a return was first initiated (e.g., Sendcloud return ID populated).';
