-- Migration: adapt_return_trigger_to_sendcloud_id_no_status
-- Reason: Modify the return trigger logic to use sendcloud_return_id as the indicator
-- for setting return_created_at. Removed reference to non-existent return_status.
-- Assumes return_created_at column exists from a previous migration.

-- Redefine the function to check sendcloud_return_id
-- Sets return_created_at when sendcloud_return_id is initially populated.
CREATE OR REPLACE FUNCTION set_return_created_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if sendcloud_return_id is being set from NULL to a non-NULL value
    IF NEW.sendcloud_return_id IS NOT NULL AND (OLD IS NULL OR OLD.sendcloud_return_id IS NULL) THEN
        -- Use the existing return_created_at column for the timestamp
        -- This assumes the return_created_at column exists.
        NEW.return_created_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS set_return_created_at_trigger ON orders;

-- Create the trigger to fire only specifically when sendcloud_return_id is updated
-- Note: Assumes 'sendcloud_return_id' and 'return_created_at' columns exist on the 'orders' table.
CREATE TRIGGER set_return_created_at_trigger
    BEFORE UPDATE OF sendcloud_return_id ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_return_created_at();

-- Add a comment explaining the trigger's purpose
COMMENT ON TRIGGER set_return_created_at_trigger ON orders IS 'Sets return_created_at when sendcloud_return_id is first populated during an UPDATE operation.';
