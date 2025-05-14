ALTER TABLE public.orders
ADD COLUMN training_done BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.orders.training_done IS 'Indicates if the training associated with this order has been completed.'; 