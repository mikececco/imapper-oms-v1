-- Drop the old columns if they exist, before attempting renames that will fail
ALTER TABLE public.orders DROP COLUMN IF EXISTS return_status;
ALTER TABLE public.orders DROP COLUMN IF EXISTS return_parcel_id;

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
-- Commented out as sendcloud_return_id already exists
/*
ALTER TABLE public.orders
RENAME COLUMN return_status TO sendcloud_return_id;
*/

-- Alter the renamed column type to TEXT if it wasn't already (e.g., if it had a CHECK constraint)
-- We might need to drop constraints first if renaming wasn't enough
-- Potentially drop old CHECK constraint if it exists and wasn't dropped automatically
-- ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_return_status_check;

-- Add the new column for the Sendcloud Parcel ID
-- Commented out as sendcloud_return_parcel_id already exists
/*
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sendcloud_return_parcel_id TEXT;
*/

-- Ensure the columns exist (added IF NOT EXISTS for safety)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sendcloud_return_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sendcloud_return_parcel_id TEXT;

-- Add comments to the columns
COMMENT ON COLUMN public.orders.sendcloud_return_id IS 'Stores the Sendcloud Return ID';
COMMENT ON COLUMN public.orders.sendcloud_return_parcel_id IS 'Stores the Sendcloud Parcel ID associated with the return';
