-- Add address_house_number column to customers table
-- This migration adds the address_house_number column to store house numbers separately

-- First check if the column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customers'
    AND column_name = 'address_house_number'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE customers ADD COLUMN address_house_number TEXT;
    
    -- Add comment to explain the column
    COMMENT ON COLUMN customers.address_house_number IS 'House number for customer address';
    
    -- Create index for faster searching
    CREATE INDEX IF NOT EXISTS idx_customers_address_house_number ON customers(address_house_number);
    
    RAISE NOTICE 'Added address_house_number column to customers table';
  ELSE
    RAISE NOTICE 'address_house_number column already exists in customers table';
  END IF;
END $$; 