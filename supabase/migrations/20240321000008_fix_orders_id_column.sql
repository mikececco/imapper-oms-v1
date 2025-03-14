-- Fix orders table id column
DO $BLOCK$
BEGIN
    -- First check if the orders table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        -- Check if id column exists
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'orders' 
            AND column_name = 'id'
        ) THEN
            -- Drop the existing id column and its dependencies
            ALTER TABLE orders DROP COLUMN id CASCADE;
        END IF;
        
        -- Add the id column initially as nullable
        ALTER TABLE orders ADD COLUMN id TEXT;
        
        -- Update existing records with generated IDs
        UPDATE orders 
        SET id = 'order_' || to_char(created_at, 'YYYYMMDD') || '_' || substr(md5(random()::text), 1, 8)
        WHERE id IS NULL;
        
        -- Now make it NOT NULL and PRIMARY KEY
        ALTER TABLE orders ALTER COLUMN id SET NOT NULL;
        ALTER TABLE orders ADD PRIMARY KEY (id);
    END IF;
END;
$BLOCK$;

-- Create the function for generating order IDs
CREATE OR REPLACE FUNCTION generate_order_id()
RETURNS TRIGGER AS $FUNC$
BEGIN
    NEW.id := 'order_' || to_char(NOW(), 'YYYYMMDD') || '_' || substr(md5(random()::text), 1, 8);
    RETURN NEW;
END;
$FUNC$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS set_order_id ON orders;

-- Create the trigger
CREATE TRIGGER set_order_id
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_id(); 