ALTER TABLE public.orders
ALTER COLUMN customs_shipment_type TYPE INTEGER USING customs_shipment_type::integer;

COMMENT ON COLUMN public.orders.customs_shipment_type IS 'DEPRECATED. Integer shipment type for customs. Allowed values: 0=Gift, 1=Documents, 2=Commercial Goods, 3=Commercial Sample, 4=Returned Goods. Use customs_information instead.'; 