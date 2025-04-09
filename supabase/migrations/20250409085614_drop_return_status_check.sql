    -- Migration: drop_return_status_check
    -- Reason: Temporarily remove the CHECK constraint on the return_status column
    -- to prevent errors during order updates when creating returns.
    -- Data integrity for return_status will need to be managed by the application.

    ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_return_status_check;