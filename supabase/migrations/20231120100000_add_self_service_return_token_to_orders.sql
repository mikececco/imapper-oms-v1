-- Add self_service_return_token to orders table
ALTER TABLE public.orders
ADD COLUMN self_service_return_token TEXT UNIQUE,
ADD CONSTRAINT ensure_self_service_return_token_is_uuid CHECK (self_service_return_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR self_service_return_token IS NULL);

-- Add an index for faster lookups on the token
CREATE INDEX IF NOT EXISTS idx_orders_self_service_return_token 
ON public.orders (self_service_return_token);

-- Optional: Add a comment to the column for better schema understanding
COMMENT ON COLUMN public.orders.self_service_return_token IS 'Unique token for customers to initiate self-service returns.'; 