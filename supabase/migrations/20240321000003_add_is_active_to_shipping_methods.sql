-- Add is_active column to shipping_methods table
ALTER TABLE shipping_methods
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add comment to the column
COMMENT ON COLUMN shipping_methods.is_active IS 'Whether this shipping method is currently active and available for use';

-- Update existing rows to have is_active set to true by default
UPDATE shipping_methods SET is_active = true WHERE is_active IS NULL; 