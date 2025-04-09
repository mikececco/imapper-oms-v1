ALTER TABLE public.orders
DROP COLUMN IF EXISTS sendcloud_parcel_id;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sendcloud_return_parcel_id TEXT;