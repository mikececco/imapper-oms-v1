-- Add missing weight and additional fields to shipping_methods table
ALTER TABLE shipping_methods
ADD COLUMN IF NOT EXISTS min_weight DECIMAL(10,3) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS max_weight DECIMAL(10,3) DEFAULT 70.0,
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS lead_time_hours INTEGER,
ADD COLUMN IF NOT EXISTS price_breakdown JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sendcloud_data JSONB;

-- Add comments to the columns
COMMENT ON COLUMN shipping_methods.min_weight IS 'Minimum weight in kg for this shipping method';
COMMENT ON COLUMN shipping_methods.max_weight IS 'Maximum weight in kg for this shipping method';
COMMENT ON COLUMN shipping_methods.price IS 'Base price for this shipping method';
COMMENT ON COLUMN shipping_methods.lead_time_hours IS 'Expected delivery time in hours';
COMMENT ON COLUMN shipping_methods.price_breakdown IS 'Detailed breakdown of pricing components';
COMMENT ON COLUMN shipping_methods.sendcloud_data IS 'Raw data from SendCloud API';

-- Update existing rows with default values where null
UPDATE shipping_methods SET min_weight = 0.0 WHERE min_weight IS NULL;
UPDATE shipping_methods SET max_weight = 70.0 WHERE max_weight IS NULL;
UPDATE shipping_methods SET price = 0.0 WHERE price IS NULL;
UPDATE shipping_methods SET price_breakdown = '[]' WHERE price_breakdown IS NULL;
UPDATE shipping_methods SET sendcloud_data = '{}' WHERE sendcloud_data IS NULL; 