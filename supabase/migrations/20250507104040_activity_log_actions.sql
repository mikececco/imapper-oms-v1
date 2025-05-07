DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'order_activity_type'
        AND e.enumlabel = 'shipping_label_created'
    ) THEN
        ALTER TYPE order_activity_type ADD VALUE 'shipping_label_created';
    END IF;
END $$;