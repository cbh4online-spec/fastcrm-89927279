
-- Add alert_settings column to renewal_contracts
ALTER TABLE public.renewal_contracts
  ADD COLUMN IF NOT EXISTS alert_settings jsonb DEFAULT '{"thresholds": [30, 15, 7, 1], "notify_user": true, "notify_client": false}'::jsonb;

-- Create renewal_payment_links table
CREATE TABLE public.renewal_payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.renewal_contracts(id) ON DELETE CASCADE,
  stripe_session_id text,
  stripe_url text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  item_ids jsonb DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renewal_payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view payment links"
  ON public.renewal_payment_links FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "workspace members can insert payment links"
  ON public.renewal_payment_links FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

-- Create renewal_alert_log table for dedup
CREATE TABLE public.renewal_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.renewal_contracts(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  recipient_type text NOT NULL DEFAULT 'user',
  sent_date date NOT NULL DEFAULT CURRENT_DATE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  payload_json jsonb DEFAULT '{}'::jsonb,
  UNIQUE (contract_id, alert_type, recipient_type, sent_date)
);

ALTER TABLE public.renewal_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view alert logs"
  ON public.renewal_alert_log FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "service role can insert alert logs"
  ON public.renewal_alert_log FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));
