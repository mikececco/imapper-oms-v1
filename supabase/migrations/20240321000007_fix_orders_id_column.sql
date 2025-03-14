-- Ensure orders table has proper id column configuration
DO $$ 
BEGIN
    -- First check if the orders table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        -- Check if id column exists and is properly configured
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'orders' 
            AND column_name = 'id'
        ) THEN
            -- Add id column if it doesn't exist
            ALTER TABLE orders ADD COLUMN id BIGSERIAL PRIMARY KEY;
        ELSE
            -- If column exists but isn't properly configured, drop and recreate it
            ALTER TABLE orders DROP COLUMN id CASCADE;
            ALTER TABLE orders ADD COLUMN id BIGSERIAL PRIMARY KEY;
        END IF;
    ELSE
        -- Create orders table if it doesn't exist
        CREATE TABLE orders (
            id BIGSERIAL PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
    END IF;
END $$; 