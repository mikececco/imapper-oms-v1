-- Add return-related fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS return_label_url TEXT,
ADD COLUMN IF NOT EXISTS return_tracking_number TEXT,
ADD COLUMN IF NOT EXISTS return_tracking_link TEXT,
ADD COLUMN IF NOT EXISTS return_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS return_status TEXT CHECK (return_status IN ('pending', 'created', 'in_transit', 'delivered', 'cancelled')),
ADD COLUMN IF NOT EXISTS return_notes TEXT;

-- Add comment to explain the return_status values
COMMENT ON COLUMN orders.return_status IS 'Status of the return: pending (return requested), created (label created), in_transit (package in transit), delivered (return received), cancelled';

-- Create an index on return_status for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_return_status ON orders(return_status);

-- Add a trigger to automatically set return_created_at when return_label_url is set
CREATE OR REPLACE FUNCTION set_return_created_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.return_label_url IS NOT NULL AND OLD.return_label_url IS NULL THEN
        NEW.return_created_at = NOW();
        NEW.return_status = 'created';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_return_created_at_trigger
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_return_created_at(); 