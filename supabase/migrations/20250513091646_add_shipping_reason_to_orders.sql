-- Add reason_for_shipment column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reason_for_shipment TEXT;

-- Add a comment to explain the column
COMMENT ON COLUMN orders.reason_for_shipment IS 'Reason for shipment, e.g. sale, gift, return, etc.'; 