-- Create enum for order pack list types
CREATE TYPE order_pack_type AS ENUM (
    'R3',
    'R3ONLY',
    'R3-P-T250',
    'R3-P-T165',
    'R3-T230',
    'R3-T165',
    'R3 SLOW P T165',
    'R3-P-T230',
    'R3 ONLY',
    'R3+P+T230',
    'T165',
    'SD',
    'T250',
    'R2ONLY',
    'R3-P-T180',
    'T230',
    'R3-P',
    'R3 BLE',
    'R3 BLE-P',
    'R3BLE-P-T165',
    'R3BLE-P-T180',
    'R3BLE-P-T230',
    'usb reader - SD',
    'R-P-T250',
    'R3BE-P-T230',
    'R2',
    'R3BE-T230'
);

-- Create order pack lists table
CREATE TABLE IF NOT EXISTS order_pack_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    value order_pack_type NOT NULL,
    label TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on value
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_pack_lists_value ON order_pack_lists(value);

-- Add index for faster label searches
CREATE INDEX IF NOT EXISTS idx_order_pack_lists_label ON order_pack_lists(label);

-- Insert predefined order pack options
INSERT INTO order_pack_lists (value, label) VALUES
    ('R3', 'R3'),
    ('R3ONLY', 'R3 ONLY'),
    ('R3-P-T250', 'R3-P-T250'),
    ('R3-P-T165', 'R3-P-T165'),
    ('R3-T230', 'R3-T230'),
    ('R3-T165', 'R3-T165'),
    ('R3 SLOW P T165', 'R3 SLOW P T165'),
    ('R3-P-T230', 'R3-P-T230'),
    ('R3 ONLY', 'R3 ONLY'),
    ('R3+P+T230', 'R3+P+T230'),
    ('T165', 'T165'),
    ('SD', 'SD'),
    ('T250', 'T250'),
    ('R2ONLY', 'R2 ONLY'),
    ('R3-P-T180', 'R3-P-T180'),
    ('T230', 'T230'),
    ('R3-P', 'R3-P'),
    ('R3 BLE', 'R3 BLE'),
    ('R3 BLE-P', 'R3 BLE-P'),
    ('R3BLE-P-T165', 'R3BLE-P-T165'),
    ('R3BLE-P-T180', 'R3BLE-P-T180'),
    ('R3BLE-P-T230', 'R3BLE-P-T230'),
    ('usb reader - SD', 'USB Reader - SD'),
    ('R-P-T250', 'R-P-T250'),
    ('R3BE-P-T230', 'R3BE-P-T230'),
    ('R2', 'R2'),
    ('R3BE-T230', 'R3BE-T230')
ON CONFLICT (value) DO UPDATE SET label = EXCLUDED.label;

-- Add order_pack_list_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_pack_list_id UUID REFERENCES order_pack_lists(id);

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_orders_order_pack_list_id ON orders(order_pack_list_id);

-- Migrate existing data
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, order_pack FROM orders WHERE order_pack IS NOT NULL LOOP
        UPDATE orders o
        SET order_pack_list_id = opl.id
        FROM order_pack_lists opl
        WHERE o.id = r.id
        AND opl.value::text = r.order_pack::text;
    END LOOP;
END $$; 