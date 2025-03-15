-- Add address_house_number column to customers table
-- This can be run directly on your database

-- Add the column if it doesn't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_house_number TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN customers.address_house_number IS 'House number for customer address';

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_customers_address_house_number ON customers(address_house_number); 