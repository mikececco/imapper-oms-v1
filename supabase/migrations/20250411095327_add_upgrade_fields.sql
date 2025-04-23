-- Add new columns for tracking upgrade shipment details separately
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upgrade_shipping_id TEXT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upgrade_tracking_number TEXT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upgrade_tracking_link TEXT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upgrade_status TEXT NULL;

-- Add comments to explain the purpose of the new columns
COMMENT ON COLUMN public.orders.upgrade_shipping_id IS 'Stores the Shipping ID for the upgraded shipment';
COMMENT ON COLUMN public.orders.upgrade_tracking_number IS 'Stores the Tracking Number for the upgraded shipment';
COMMENT ON COLUMN public.orders.upgrade_tracking_link IS 'Stores the Tracking Link for the upgraded shipment';
COMMENT ON COLUMN public.orders.upgrade_status IS 'Stores the delivery status for the upgraded shipment';