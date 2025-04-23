ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sendcloud_return_reason TEXT NULL;

COMMENT ON COLUMN public.orders.sendcloud_return_reason IS 'Reason selected for the return label generated via Sendcloud.'; 