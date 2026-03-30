
-- 1. marketplace_orders (links store_orders to sellers)
CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  store_order_id uuid NOT NULL REFERENCES store_orders(id),
  seller_id uuid NOT NULL REFERENCES c2c_sellers(id),
  listing_id uuid REFERENCES c2c_listings(id),
  gross_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. marketplace_wallet_entries (seller ledger)
CREATE TABLE public.marketplace_wallet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  seller_id uuid NOT NULL REFERENCES c2c_sellers(id),
  entry_type text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  reference_type text,
  reference_id uuid,
  balance_after numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_wallet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_read_marketplace_orders" ON public.marketplace_orders
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "workspace_read_wallet_entries" ON public.marketplace_wallet_entries
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- 3. Add C2C config columns to store_settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS c2c_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS c2c_seller_approval_required boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS c2c_listing_moderation_required boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS c2c_default_commission_rate numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS c2c_payout_minimum_amount numeric DEFAULT 25,
  ADD COLUMN IF NOT EXISTS c2c_payout_manual_mode boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS c2c_allow_mixed_cart boolean DEFAULT true;

-- Indexes
CREATE INDEX idx_marketplace_orders_workspace ON public.marketplace_orders(workspace_id);
CREATE INDEX idx_marketplace_orders_seller ON public.marketplace_orders(seller_id);
CREATE INDEX idx_marketplace_orders_store_order ON public.marketplace_orders(store_order_id);
CREATE INDEX idx_marketplace_wallet_workspace_seller ON public.marketplace_wallet_entries(workspace_id, seller_id);
