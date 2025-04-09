-- Remove unnecessary return fields added previously
ALTER TABLE public.orders
DROP COLUMN IF EXISTS return_label_url,
DROP COLUMN IF EXISTS return_tracking_number,
DROP COLUMN IF EXISTS return_tracking_link,
DROP COLUMN IF EXISTS return_created_at,
DROP COLUMN IF EXISTS return_notes;

-- Rename return_status (or another suitable column) to hold the Sendcloud Return ID
-- Note: If you NEED the return_status column for its original purpose, 
--       you should ADD a new column sendcloud_return_id TEXT instead of renaming.
--       Assuming for now return_status can be repurposed:
ALTER TABLE public.orders
RENAME COLUMN return_status TO sendcloud_return_id;

-- Alter the renamed column type to TEXT if it wasn't already (e.g., if it had a CHECK constraint)
-- We might need to drop constraints first if renaming wasn't enough
ALTER TABLE public.orders
ALTER COLUMN sendcloud_return_id TYPE TEXT;
-- Potentially drop old CHECK constraint if it exists and wasn't dropped automatically
-- ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_return_status_check;

-- Add the new column for the Sendcloud Parcel ID
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sendcloud_parcel_id TEXT;
