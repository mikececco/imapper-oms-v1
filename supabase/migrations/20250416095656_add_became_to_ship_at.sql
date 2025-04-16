ALTER TABLE public.orders
ADD COLUMN became_to_ship_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.orders.became_to_ship_at IS 
'Timestamp indicating when the order was last processed for shipping label creation.';