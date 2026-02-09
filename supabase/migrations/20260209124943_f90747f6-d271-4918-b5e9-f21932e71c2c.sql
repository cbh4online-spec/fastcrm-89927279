
-- Add user_id to store_orders for tracking logged-in purchasers
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_store_orders_workspace_status ON public.store_orders (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_store_orders_customer_email ON public.store_orders (customer_email);
