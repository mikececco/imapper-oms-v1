ALTER TABLE public.orders
ADD COLUMN upgrade_shipping_id TEXT NULL,
ADD COLUMN upgrade_tracking_number TEXT NULL,
ADD COLUMN upgrade_tracking_link TEXT NULL,
ADD COLUMN upgrade_status TEXT NULL;

COMMENT ON COLUMN public.orders.upgrade_shipping_id IS 'Shipping ID for the label created during an order upgrade.';
COMMENT ON COLUMN public.orders.upgrade_tracking_number IS 'Tracking number for the label created during an order upgrade.';
COMMENT ON COLUMN public.orders.upgrade_tracking_link IS 'Tracking link for the label created during an order upgrade.';
COMMENT ON COLUMN public.orders.upgrade_status IS 'Shipping status for the label created during an order upgrade.';