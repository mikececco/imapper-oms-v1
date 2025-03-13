-- First check if the enum type exists
DO $$ 
BEGIN 
    -- Create the enum type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_activity_type') THEN
        CREATE TYPE order_activity_type AS ENUM (
            'payment_status',
            'shipping_status',
            'order_status',
            'order_update'
        );
    ELSE
        -- If the enum exists, try to add the new value
        BEGIN
            ALTER TYPE order_activity_type ADD VALUE IF NOT EXISTS 'order_update';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists, do nothing
            NULL;
        END;
    END IF;
END $$; 