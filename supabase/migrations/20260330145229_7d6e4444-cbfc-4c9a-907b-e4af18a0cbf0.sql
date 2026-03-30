
-- Add recovery fields to store_abandoned_carts
ALTER TABLE public.store_abandoned_carts
  ADD COLUMN IF NOT EXISTS recovery_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS recovery_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_channel TEXT,
  ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovered_value NUMERIC(12,2);

-- Add abandoned_cart_id to store_orders
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS abandoned_cart_id UUID REFERENCES public.store_abandoned_carts(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_abandoned_carts_token ON public.store_abandoned_carts(recovery_token) WHERE recovery_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_abandoned_carts_status ON public.store_abandoned_carts(recovery_status);
CREATE INDEX IF NOT EXISTS idx_store_orders_abandoned_cart ON public.store_orders(abandoned_cart_id) WHERE abandoned_cart_id IS NOT NULL;
