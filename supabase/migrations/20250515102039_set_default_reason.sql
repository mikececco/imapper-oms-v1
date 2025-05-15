-- Set default value for reason_for_shipment column in orders table
ALTER TABLE public.orders
ALTER COLUMN reason_for_shipment SET DEFAULT 'new order';

-- Optional: Update existing NULL values to the new default if desired
-- UPDATE public.orders
-- SET reason_for_shipment = 'new order'
-- WHERE reason_for_shipment IS NULL; 