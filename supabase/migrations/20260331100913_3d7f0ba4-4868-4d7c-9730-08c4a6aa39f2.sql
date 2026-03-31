
-- marketplace_payouts table
CREATE TABLE public.marketplace_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  seller_id uuid NOT NULL REFERENCES c2c_sellers(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'EUR',
  status text DEFAULT 'requested',
  payout_method text,
  notes text,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketplace_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_read_marketplace_payouts" ON public.marketplace_payouts
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "workspace_insert_marketplace_payouts" ON public.marketplace_payouts
  FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Risk flags on c2c_sellers
ALTER TABLE public.c2c_sellers
  ADD COLUMN IF NOT EXISTS suspected_fraud boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispute_open boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS excessive_cancellations boolean DEFAULT false;
