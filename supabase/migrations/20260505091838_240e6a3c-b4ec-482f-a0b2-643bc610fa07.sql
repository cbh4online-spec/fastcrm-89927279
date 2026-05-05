-- ============================================================
-- ifthenpay payments infrastructure (multi-tenant per workspace)
-- ============================================================

-- 1. SETTINGS table (one per workspace)
CREATE TABLE public.ifthenpay_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  test_mode BOOLEAN NOT NULL DEFAULT true,
  -- Method-specific keys (encrypted at rest by Supabase)
  mb_entidade TEXT,
  mb_subentidade TEXT,
  mb_key TEXT,
  mbway_key TEXT,
  cc_key TEXT,
  payshop_key TEXT,
  pix_key TEXT,
  -- Anti-phishing key (we generate it; client copies it to ifthenpay backoffice)
  anti_phishing_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  -- Active methods array
  enabled_methods TEXT[] NOT NULL DEFAULT ARRAY['multibanco','mbway']::TEXT[],
  expiry_days INTEGER NOT NULL DEFAULT 3 CHECK (expiry_days BETWEEN 1 AND 30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ifthenpay_settings_workspace ON public.ifthenpay_settings(workspace_id);

ALTER TABLE public.ifthenpay_settings ENABLE ROW LEVEL SECURITY;

-- Only workspace admins/owners can see / write settings (keys are sensitive)
CREATE POLICY "Workspace admins can read ifthenpay settings"
  ON public.ifthenpay_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = ifthenpay_settings.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner','admin')
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace admins can insert ifthenpay settings"
  ON public.ifthenpay_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = ifthenpay_settings.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner','admin')
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace admins can update ifthenpay settings"
  ON public.ifthenpay_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = ifthenpay_settings.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner','admin')
    )
    OR public.is_super_admin(auth.uid())
  );

-- 2. PAYMENTS table
CREATE TABLE public.ifthenpay_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('order','invoice','subscription','manual')),
  reference_id UUID,
  method TEXT NOT NULL CHECK (method IN ('multibanco','mbway','cc','payshop','pix')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','cancelled','failed')),
  -- Method-specific result data
  mb_entidade TEXT,
  mb_referencia TEXT,
  mb_expiry_date TIMESTAMPTZ,
  mbway_request_id TEXT,
  mbway_phone TEXT,
  cc_request_id TEXT,
  cc_payment_url TEXT,
  payshop_reference TEXT,
  -- ifthenpay short order id (used externally; max 15 chars for MB)
  ifthenpay_order_id TEXT NOT NULL UNIQUE,
  paid_at TIMESTAMPTZ,
  paid_amount NUMERIC(12,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ifthenpay_payments_workspace ON public.ifthenpay_payments(workspace_id, created_at DESC);
CREATE INDEX idx_ifthenpay_payments_status ON public.ifthenpay_payments(status);
CREATE INDEX idx_ifthenpay_payments_reference ON public.ifthenpay_payments(reference_type, reference_id);
CREATE INDEX idx_ifthenpay_payments_order_id ON public.ifthenpay_payments(ifthenpay_order_id);

ALTER TABLE public.ifthenpay_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read ifthenpay payments"
  ON public.ifthenpay_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = ifthenpay_payments.workspace_id
        AND wm.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

-- INSERT/UPDATE/DELETE only via service_role (edge functions)

-- 3. CALLBACK LOGS table
CREATE TABLE public.ifthenpay_callback_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID,
  payment_id UUID REFERENCES public.ifthenpay_payments(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  query_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted','rejected_key','rejected_unknown_workspace','rejected_unknown_payment','duplicate_ignored','error')),
  error_message TEXT,
  request_ip TEXT
);

CREATE INDEX idx_ifthenpay_callback_logs_workspace ON public.ifthenpay_callback_logs(workspace_id, received_at DESC);
CREATE INDEX idx_ifthenpay_callback_logs_payment ON public.ifthenpay_callback_logs(payment_id);

ALTER TABLE public.ifthenpay_callback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can read callback logs"
  ON public.ifthenpay_callback_logs FOR SELECT
  USING (
    workspace_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ifthenpay_callback_logs.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner','admin')
      )
      OR public.is_super_admin(auth.uid())
    )
  );

-- INSERT only via service_role

-- 4. updated_at triggers
CREATE TRIGGER trg_ifthenpay_settings_updated
  BEFORE UPDATE ON public.ifthenpay_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ifthenpay_payments_updated
  BEFORE UPDATE ON public.ifthenpay_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Helper RPC: resolve workspace by slug for the public callback (security definer)
CREATE OR REPLACE FUNCTION public.ifthenpay_resolve_workspace_by_slug(p_slug TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.workspaces WHERE slug = p_slug LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.ifthenpay_resolve_workspace_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ifthenpay_resolve_workspace_by_slug(TEXT) TO service_role;