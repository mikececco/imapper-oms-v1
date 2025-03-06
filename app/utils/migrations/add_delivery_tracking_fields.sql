-- Add delivery tracking fields to the orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_link TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_matching_address_country BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_successful BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_instruction TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_delivery_status_check TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sendcloud_data JSONB;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_successful ON orders(payment_successful);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_link ON orders(tracking_link);

-- Add comment to explain the shipping_instruction field
COMMENT ON COLUMN orders.shipping_instruction IS 'Automatically determined shipping instruction based on order status, payment status, and tracking information';

-- Create or replace function to update shipping instruction based on conditions
CREATE OR REPLACE FUNCTION update_shipping_instruction()
RETURNS TRIGGER AS $$
BEGIN
  -- Apply the complex conditional logic to determine shipping instruction
  IF 
    (NEW.delivery_status IS NOT NULL AND LENGTH(TRIM(COALESCE(NEW.delivery_status, ''))) > 0) AND 
    NEW.payment_successful = true AND 
    (NEW.stripe_customer_id IS NOT NULL AND LENGTH(TRIM(COALESCE(NEW.stripe_customer_id, ''))) > 0) AND
    NEW.delivery_status = 'Delivered'
  THEN
    NEW.shipping_instruction := 'DELIVERED';
  ELSIF
    (NEW.delivery_status IS NOT NULL AND LENGTH(TRIM(COALESCE(NEW.delivery_status, ''))) > 0) AND
    NEW.delivery_status != 'Ready to send' AND
    NEW.payment_successful = true AND
    (NEW.stripe_customer_id IS NOT NULL AND LENGTH(TRIM(COALESCE(NEW.stripe_customer_id, ''))) > 0) AND
    NEW.delivery_status != 'Delivered' AND
    NEW.tracking_link != 'Empty label' AND
    NEW.tracking_link IS NOT NULL AND
    NEW.tracking_matching_address_country != true
  THEN
    NEW.shipping_instruction := 'SHIPPED';
  ELSIF
    (NEW.delivery_status IS NULL OR LENGTH(TRIM(COALESCE(NEW.delivery_status, ''))) = 0) AND
    NEW.payment_successful = true AND
    (NEW.stripe_customer_id IS NOT NULL AND LENGTH(TRIM(COALESCE(NEW.stripe_customer_id, ''))) > 0) AND
    (
      NEW.tracking_link = 'Empty label' OR
      NEW.tracking_link IS NULL OR
      LENGTH(TRIM(COALESCE(NEW.tracking_link, ''))) = 0 OR
      LEFT(TRIM(COALESCE(NEW.tracking_link, '')), 5) != 'https'
    )
  THEN
    NEW.shipping_instruction := 'TO BE SHIPPED BUT NO STICKER';
  ELSIF
    (NEW.delivery_status IS NULL OR LENGTH(TRIM(COALESCE(NEW.delivery_status, ''))) = 0) AND
    NEW.payment_successful = true AND
    (NEW.stripe_customer_id IS NOT NULL AND LENGTH(TRIM(COALESCE(NEW.stripe_customer_id, ''))) > 0) AND
    NEW.tracking_link != 'Empty label' AND
    NEW.tracking_link IS NOT NULL AND
    NEW.tracking_matching_address_country != false
  THEN
    NEW.shipping_instruction := 'TO BE SHIPPED BUT WRONG TRACKING LINK';
  ELSIF
    NEW.delivery_status = 'Ready to send' AND
    NEW.payment_successful = true AND
    (NEW.stripe_customer_id IS NOT NULL AND LENGTH(TRIM(COALESCE(NEW.stripe_customer_id, ''))) > 0) AND
    (NEW.tracking_link IS NOT NULL AND LENGTH(TRIM(COALESCE(NEW.tracking_link, ''))) > 0)
  THEN
    NEW.shipping_instruction := 'TO SHIP';
  ELSIF
    NEW.tracking_link = 'Empty label' AND
    NEW.payment_successful = false AND
    (NEW.delivery_status IS NULL OR LENGTH(TRIM(COALESCE(NEW.delivery_status, ''))) = 0)
  THEN
    NEW.shipping_instruction := 'DO NOT SHIP';
  ELSE
    NEW.shipping_instruction := 'UNKNOWN';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update shipping instruction when relevant fields change
DROP TRIGGER IF EXISTS update_shipping_instruction_trigger ON orders;
CREATE TRIGGER update_shipping_instruction_trigger
BEFORE INSERT OR UPDATE OF delivery_status, payment_successful, stripe_customer_id, tracking_link, tracking_matching_address_country
ON orders
FOR EACH ROW
EXECUTE FUNCTION update_shipping_instruction(); 