-- Add welcome_email_sent column to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE;

-- Add a comment to explain the column
COMMENT ON COLUMN public.orders.welcome_email_sent IS 'Indicates if the welcome email has been sent for this order.'; 