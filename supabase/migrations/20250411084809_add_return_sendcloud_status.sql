ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sendcloud_return_status TEXT NULL;