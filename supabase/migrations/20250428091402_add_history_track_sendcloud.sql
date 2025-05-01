ALTER TABLE orders
ADD COLUMN IF NOT EXISTS sendcloud_tracking_history jsonb NULL,
ADD COLUMN IF NOT EXISTS expected_delivery_date date NULL;

COMMENT ON COLUMN orders.sendcloud_tracking_history IS 'Stores the full tracking history array from Sendcloud API.';
COMMENT ON COLUMN orders.expected_delivery_date IS 'Stores the expected delivery date from Sendcloud API.';