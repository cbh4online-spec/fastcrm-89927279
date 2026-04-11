
-- 1. Boost Wallets
CREATE TABLE public.c2c_boost_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.c2c_sellers(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id, workspace_id)
);

ALTER TABLE public.c2c_boost_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own wallet"
  ON public.c2c_boost_wallets FOR SELECT
  TO authenticated
  USING (
    seller_id IN (
      SELECT id FROM public.c2c_sellers WHERE user_id = auth.uid()
    )
  );

-- 2. Boost Transactions (ledger)
CREATE TABLE public.c2c_boost_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.c2c_boost_wallets(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'spend', 'refund')),
  amount integer NOT NULL,
  listing_id uuid REFERENCES public.c2c_listings(id) ON DELETE SET NULL,
  description text,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.c2c_boost_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own transactions"
  ON public.c2c_boost_transactions FOR SELECT
  TO authenticated
  USING (
    wallet_id IN (
      SELECT w.id FROM public.c2c_boost_wallets w
      JOIN public.c2c_sellers s ON s.id = w.seller_id
      WHERE s.user_id = auth.uid()
    )
  );

-- 3. Boost Config
CREATE TABLE public.c2c_boost_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  credit_unit_price numeric(10,2) NOT NULL DEFAULT 0.50,
  highlight_cost_per_day integer NOT NULL DEFAULT 5,
  cpc_cost_per_click integer NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'eur',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.c2c_boost_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view config"
  ON public.c2c_boost_config FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- 4. Update c2c_sponsored_listings
ALTER TABLE public.c2c_sponsored_listings
  ADD COLUMN IF NOT EXISTS boost_type text DEFAULT 'highlight' CHECK (boost_type IN ('highlight', 'cpc', 'both')),
  ADD COLUMN IF NOT EXISTS daily_cpc_budget integer DEFAULT 0;

-- 5. Spend credits RPC (atomic with lock)
CREATE OR REPLACE FUNCTION public.spend_boost_credits(
  p_wallet_id uuid,
  p_amount integer,
  p_listing_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_workspace_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_tx_id uuid;
BEGIN
  -- Lock wallet row
  SELECT balance INTO v_balance
  FROM c2c_boost_wallets
  WHERE id = p_wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'wallet_not_found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'balance', v_balance);
  END IF;

  -- Debit
  UPDATE c2c_boost_wallets SET balance = balance - p_amount, updated_at = now() WHERE id = p_wallet_id;

  -- Record transaction
  INSERT INTO c2c_boost_transactions (wallet_id, workspace_id, type, amount, listing_id, description)
  VALUES (p_wallet_id, COALESCE(p_workspace_id, (SELECT workspace_id FROM c2c_boost_wallets WHERE id = p_wallet_id)), 'spend', -p_amount, p_listing_id, p_description)
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'new_balance', v_balance - p_amount);
END;
$$;
