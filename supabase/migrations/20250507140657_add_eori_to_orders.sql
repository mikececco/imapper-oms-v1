ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS eori TEXT NULL;

COMMENT ON COLUMN public.orders.eori IS 'EORI number of the sender or exporter, required for customs clearance for shipments from France to GB, CH, and some other non-EU countries.';