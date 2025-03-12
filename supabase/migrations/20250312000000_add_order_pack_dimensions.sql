-- Add dimensions and comment columns to order_pack_lists table
ALTER TABLE order_pack_lists
ADD COLUMN IF NOT EXISTS weight DECIMAL(10,3) DEFAULT 1.000,
ADD COLUMN IF NOT EXISTS height DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS width DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS length DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS comment TEXT;

-- Add comments to explain the columns
COMMENT ON COLUMN order_pack_lists.weight IS 'Weight of the order pack in kg';
COMMENT ON COLUMN order_pack_lists.height IS 'Height of the order pack in cm';
COMMENT ON COLUMN order_pack_lists.width IS 'Width of the order pack in cm';
COMMENT ON COLUMN order_pack_lists.length IS 'Length of the order pack in cm';
COMMENT ON COLUMN order_pack_lists.comment IS 'Additional notes or comments about the order pack';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_order_pack_lists_weight ON order_pack_lists(weight);
CREATE INDEX IF NOT EXISTS idx_order_pack_lists_dimensions ON order_pack_lists(height, width, length);

-- Update existing records with default dimensions
UPDATE order_pack_lists
SET 
    weight = 1.000,
    height = 20.00,
    width = 15.00,
    length = 10.00
WHERE weight IS NULL; 