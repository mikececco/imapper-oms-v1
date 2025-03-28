-- Add hubspot_owner column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS hubspot_owner TEXT;

-- Add comment to the column
COMMENT ON COLUMN customers.hubspot_owner IS 'HubSpot owner for this customer';

-- Create an index on hubspot_owner for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_hubspot_owner ON customers (hubspot_owner); 