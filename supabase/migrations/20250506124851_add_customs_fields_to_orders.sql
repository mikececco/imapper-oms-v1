ALTER TABLE public.orders
ADD COLUMN customs_shipment_type TEXT,
ADD COLUMN customs_invoice_nr TEXT,
ADD COLUMN customs_parcel_items JSONB;

-- Optional: Add comments to describe the new columns
COMMENT ON COLUMN public.orders.customs_shipment_type IS 'Type of shipment for customs (e.g., commercial_goods, gift)';
COMMENT ON COLUMN public.orders.customs_invoice_nr IS 'Invoice number for customs';
COMMENT ON COLUMN public.orders.customs_parcel_items IS 'Array of items for customs declaration, stored as JSONB. Each item includes description, quantity, value, weight, hs_code, origin_country, sku.';
