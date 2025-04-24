-- Create enum for activity types (Wrapped in IF NOT EXISTS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_activity_type') THEN
        CREATE TYPE order_activity_type AS ENUM (
            'created',
            'updated',
            'shipping_label_created',
            'payment_status_changed',
            'delivery_status_changed',
            'order_pack_changed',
            'note_added',
            'stripe_payment_received',
            'payment_marked_paid',
            'payment_marked_unpaid'
            -- Note: 'order_update' was added conditionally in a later migration (20240320...)
        );
    END IF;
END $$;

-- Create order activities table
CREATE TABLE order_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    action_type order_activity_type NOT NULL,
    changes JSONB DEFAULT '{}',
    previous_value JSONB DEFAULT NULL,
    new_value JSONB DEFAULT NULL,
    performed_by UUID DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_order_activities_order_id ON order_activities(order_id);
CREATE INDEX idx_order_activities_action_type ON order_activities(action_type);
CREATE INDEX idx_order_activities_created_at ON order_activities(created_at);

-- Add function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_order_activities_updated_at
    BEFORE UPDATE ON order_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log order activities
CREATE OR REPLACE FUNCTION log_order_activity(
    p_order_id TEXT,
    p_action_type order_activity_type,
    p_changes JSONB DEFAULT '{}',
    p_previous_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO order_activities (
        order_id,
        action_type,
        changes,
        previous_value,
        new_value,
        performed_by
    ) VALUES (
        p_order_id,
        p_action_type,
        p_changes,
        p_previous_value,
        p_new_value,
        p_performed_by
    ) RETURNING id INTO v_activity_id;

    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;