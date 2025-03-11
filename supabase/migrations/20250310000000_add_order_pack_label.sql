-- Add order_pack_label column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_pack_label TEXT;

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_orders_order_pack_label ON orders(order_pack_label);

-- Add comment to explain the column
COMMENT ON COLUMN orders.order_pack_label IS 'Display label for the selected order pack option';

-- Update existing orders with their corresponding labels
DO $$
BEGIN
    UPDATE orders
    SET order_pack_label = CASE
        WHEN order_pack = 'R3' THEN 'R3'
        WHEN order_pack = 'envoyé' THEN 'Envoyé'
        WHEN order_pack = 'R3-P-T250' THEN 'R3-P-T250'
        WHEN order_pack = 'R3-P-T165' THEN 'R3-P-T165'
        WHEN order_pack = 'R3-T230' THEN 'R3-T230'
        WHEN order_pack = 'R3- P- T230' THEN 'R3- P- T230'
        WHEN order_pack = 'R3-T165' THEN 'R3-T165'
        WHEN order_pack = 'R3 SLOW P T165' THEN 'R3 SLOW P T165'
        WHEN order_pack = 'R3ONLY' THEN 'R3 ONLY'
        WHEN order_pack = 'R3-P-T230' THEN 'R3-P-T230'
        WHEN order_pack = 'R3 ONLY' THEN 'R3 ONLY'
        WHEN order_pack = 'R3+P+T230' THEN 'R3+P+T230'
        WHEN order_pack = 'T165' THEN 'T165'
        WHEN order_pack = 'SD' THEN 'SD'
        WHEN order_pack = 'T250' THEN 'T250'
        WHEN order_pack = 'R2ONLY' THEN 'R2 ONLY'
        WHEN order_pack = 'R3-P-T180' THEN 'R3-P-T180'
        WHEN order_pack = 'T230' THEN 'T230'
        WHEN order_pack = 'R3-P' THEN 'R3-P'
        WHEN order_pack = 'R3 BLE' THEN 'R3 BLE'
        WHEN order_pack = 'R3 BLE-P' THEN 'R3 BLE-P'
        WHEN order_pack = 'R3BLE-P-T165' THEN 'R3BLE-P-T165'
        WHEN order_pack = 'R3BLE-P-T180' THEN 'R3BLE-P-T180'
        WHEN order_pack = 'R3BLE-P-T230' THEN 'R3BLE-P-T230'
        WHEN order_pack = 'usb reader - SD' THEN 'USB Reader - SD'
        WHEN order_pack = 'R-P-T250' THEN 'R-P-T250'
        WHEN order_pack = 'R3BE-P-T230' THEN 'R3BE-P-T230'
        WHEN order_pack = 'R2' THEN 'R2'
        WHEN order_pack = 'chargeur pour ancien model' THEN 'Chargeur pour ancien model'
        WHEN order_pack = 'R3BE-T230' THEN 'R3BE-T230'
        ELSE order_pack
    END
    WHERE order_pack IS NOT NULL;
END $$; 