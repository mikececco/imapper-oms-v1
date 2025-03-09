-- Migration: Add shipping_id and last_delivery_status_check columns to orders table

-- Add shipping_id column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_id TEXT;

-- Add last_delivery_status_check column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS last_delivery_status_check TIMESTAMP WITH TIME ZONE;

-- Add sendcloud_data column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS sendcloud_data JSONB;

-- Add comments to the columns
COMMENT ON COLUMN orders.shipping_id IS 'SendCloud parcel ID';
COMMENT ON COLUMN orders.last_delivery_status_check IS 'Timestamp of last delivery status check';
COMMENT ON COLUMN orders.sendcloud_data IS 'Raw data from SendCloud API';

-- Create an index on shipping_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_shipping_id ON orders (shipping_id);

-- Create a function to update shipping_id for existing orders
CREATE OR REPLACE FUNCTION update_shipping_id_from_sendcloud_data()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count INTEGER := 0;
  column_exists BOOLEAN;
BEGIN
  -- Check if sendcloud_data column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'sendcloud_data'
  ) INTO column_exists;
  
  IF column_exists THEN
    -- Update shipping_id from sendcloud_data for orders that have it
    UPDATE orders
    SET shipping_id = (sendcloud_data->>'id')::TEXT
    WHERE 
      sendcloud_data IS NOT NULL 
      AND sendcloud_data->>'id' IS NOT NULL
      AND (shipping_id IS NULL OR shipping_id = '');
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSE
    RAISE NOTICE 'sendcloud_data column does not exist, skipping update';
  END IF;
  
  RETURN updated_count;
END;
$$;

-- Run the function to update existing orders
SELECT update_shipping_id_from_sendcloud_data() AS updated_orders;

-- Create a function to execute arbitrary SQL (for future migrations)
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$; 