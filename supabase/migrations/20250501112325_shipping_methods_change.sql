-- Migration script to drop and recreate the shipping_methods table with the correct structure

BEGIN; -- Start transaction

-- 1. Drop the existing table (if it exists) - THIS DELETES ALL DATA in the table
DROP TABLE IF EXISTS public.shipping_methods;

-- 2. Recreate the table with the desired structure
CREATE TABLE public.shipping_methods (
    id INT8 PRIMARY KEY NOT NULL, -- SendCloud ID as primary key
    name TEXT NOT NULL,           -- Shipping method name
    carrier TEXT,                 -- Carrier code (e.g., 'dhl_express')
    min_weight NUMERIC,           -- Minimum weight
    max_weight NUMERIC,           -- Maximum weight
    service_point_input TEXT,     -- Service point requirement ('none', 'required', 'optional')
    raw_data JSONB                 -- Store the full SendCloud method object
    -- Add any other columns you might want to store directly
);

-- 3. Optional: Add an index on the 'name' column for faster filtering
CREATE INDEX IF NOT EXISTS idx_shipping_methods_name ON public.shipping_methods (name);

-- 4. Optional: Add comments to columns for clarity
COMMENT ON COLUMN public.shipping_methods.id IS 'SendCloud internal shipping method ID, used as Primary Key.';
COMMENT ON COLUMN public.shipping_methods.raw_data IS 'Full JSON object for the shipping method as returned by SendCloud API.';

COMMIT; -- Commit transaction