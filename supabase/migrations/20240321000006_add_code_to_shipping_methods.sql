-- Add code column to shipping_methods table
ALTER TABLE shipping_methods
ADD COLUMN IF NOT EXISTS code VARCHAR(255) NOT NULL DEFAULT 'default_code';

-- Add comment to the column
COMMENT ON COLUMN shipping_methods.code IS 'Unique code identifier for the shipping method'; 