ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sendcloud_return_label_url TEXT NULL;

COMMENT ON COLUMN public.orders.sendcloud_return_label_url IS 'URL for the generated Sendcloud return label PDF.';