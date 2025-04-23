-- Create shipping_methods table
CREATE TABLE IF NOT EXISTS public.shipping_methods (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous access (read-only)
CREATE POLICY "Allow anonymous read access" 
    ON public.shipping_methods 
    FOR SELECT 
    USING (true);

-- Ensure the unique constraint exists on the 'code' column for ON CONFLICT
-- This might error if the constraint ALREADY exists, but the INSERT error suggests it doesn't.
ALTER TABLE public.shipping_methods ADD CONSTRAINT shipping_methods_code_key UNIQUE (code);

-- Insert default shipping methods
INSERT INTO public.shipping_methods (code, name, display_order, active)
VALUES 
    ('standard', 'Standard', 1, true),
    ('express', 'Express', 2, true),
    ('priority', 'Priority', 3, true),
    ('economy', 'Economy', 4, true)
ON CONFLICT (code) DO UPDATE 
SET 
    name = EXCLUDED.name,
    display_order = EXCLUDED.display_order,
    active = EXCLUDED.active,
    updated_at = NOW(); 