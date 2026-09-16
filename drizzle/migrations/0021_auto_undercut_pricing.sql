ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS competitor_refs_count INTEGER,
  ADD COLUMN IF NOT EXISTS competitor_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_price_excluded BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.store_auto_price_settings (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  undercut_pct NUMERIC NOT NULL DEFAULT 1,
  max_drop_pct NUMERIC NOT NULL DEFAULT 20,
  default_min_margin_pct NUMERIC NOT NULL DEFAULT 10,
  paused_reason TEXT,
  last_run_at TIMESTAMPTZ,
  lock_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_auto_price_settings TO authenticated;
GRANT ALL ON public.store_auto_price_settings TO service_role;

ALTER TABLE public.store_auto_price_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select_auto_price_settings"
  ON public.store_auto_price_settings FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "workspace_managers_write_auto_price_settings"
  ON public.store_auto_price_settings FOR ALL TO authenticated
  USING (public.can_manage_workspace(workspace_id, auth.uid()))
  WITH CHECK (public.can_manage_workspace(workspace_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_products_auto_price
  ON public.products(workspace_id) WHERE auto_price_excluded = false;