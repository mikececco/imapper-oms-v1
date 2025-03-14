-- Add missing columns to shipping_methods table
ALTER TABLE shipping_methods
ADD COLUMN IF NOT EXISTS countries TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS carrier VARCHAR(255);

-- Add comment to the columns
COMMENT ON COLUMN shipping_methods.countries IS 'Array of country codes where this shipping method is available';
COMMENT ON COLUMN shipping_methods.carrier IS 'The carrier name (e.g., UPS, DHL, etc.)';

-- Update existing rows to have empty arrays for countries if null
UPDATE shipping_methods SET countries = '{}' WHERE countries IS NULL; 