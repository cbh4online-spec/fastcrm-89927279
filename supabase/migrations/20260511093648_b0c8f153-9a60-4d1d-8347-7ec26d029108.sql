-- 1) Extend invoices with external provider tracking
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS external_provider text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS external_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoices_external
  ON public.invoices (workspace_id, external_provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_external_provider
  ON public.invoices (workspace_id, external_provider)
  WHERE external_provider IS NOT NULL;

-- 2) billing_sync_runs table
CREATE TABLE IF NOT EXISTS public.billing_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES public.workspace_billing_integrations(id) ON DELETE CASCADE,
  trigger text NOT NULL DEFAULT 'manual', -- manual | cron
  status text NOT NULL DEFAULT 'running', -- running | ok | error
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  cursor_from timestamptz,
  cursor_to timestamptz,
  imported_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  error_message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bsr_integration ON public.billing_sync_runs (integration_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_bsr_workspace ON public.billing_sync_runs (workspace_id, started_at DESC);

ALTER TABLE public.billing_sync_runs ENABLE ROW LEVEL SECURITY;

-- SELECT: workspace admins or super admin
CREATE POLICY "bsr_select_admins"
  ON public.billing_sync_runs FOR SELECT TO authenticated
  USING (
    public.is_workspace_admin(auth.uid(), workspace_id)
    OR public.is_super_admin(auth.uid())
  );

-- INSERT/UPDATE/DELETE blocked for client; only service_role writes.
-- (No policy for INSERT/UPDATE/DELETE => denied for authenticated users.)
