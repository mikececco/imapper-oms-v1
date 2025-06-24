-- Add sendcloud_return_delivered_at column to track when returns are delivered
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sendcloud_return_delivered_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.orders.sendcloud_return_delivered_at IS 'Timestamp when the return was delivered according to SendCloud API'; 