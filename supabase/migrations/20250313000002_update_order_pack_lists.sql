-- First, remove references to order_pack_lists in the orders table
UPDATE orders SET order_pack_list_id = NULL;

-- Now we can safely delete all existing order pack lists
DELETE FROM order_pack_lists;

-- Insert new order pack options with their weights
INSERT INTO order_pack_lists (value, label, weight) VALUES
    ('P', 'P', 0.2),
    ('R3', 'R3', 0.5),
    ('R3_BLE', 'R3 BLE', 0.5),
    ('R3-P', 'R3-P', 0.5),
    ('R3-P-T165', 'R3-P-T165', 2.5),
    ('R3-P-T180', 'R3-P-T180', 2.5),
    ('R3-P-T230', 'R3-P-T230', 3.5),
    ('R3-P-T250', 'R3-P-T250', 3.5),
    ('R3BLE-P-T165', 'R3BLE-P-T165', 2.5),
    ('R3BLE-P-T180', 'R3BLE-P-T180', 2.5),
    ('R3BLE-P-T230', 'R3BLE-P-T230', 3.5),
    ('SD', 'SD', 0.2),
    ('T250', 'T250', 5.0)
ON CONFLICT (value) DO UPDATE 
SET 
    label = EXCLUDED.label,
    weight = EXCLUDED.weight;

-- Try to match existing orders with new order packs based on the order_pack field
UPDATE orders o
SET order_pack_list_id = opl.id
FROM order_pack_lists opl
WHERE o.order_pack = opl.value
  AND o.order_pack_list_id IS NULL;

-- Add comment to explain the update
COMMENT ON TABLE order_pack_lists IS 'Updated order pack list options with standardized weights in kg'; 