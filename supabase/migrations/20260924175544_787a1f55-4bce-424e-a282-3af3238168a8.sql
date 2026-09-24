-- Estado de sincronização por contacto (controlo de tentativas e erros)
ALTER TABLE public.mymia_crm_lead_links
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

-- Configuração da tarefa automática
ALTER TABLE public.mymia_crm_sync_settings
  ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_sync_interval_minutes INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS last_auto_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_auto_run_status TEXT,
  ADD COLUMN IF NOT EXISTS last_auto_run_detail JSONB;

-- Histórico de execuções automáticas
CREATE TABLE IF NOT EXISTS public.mymia_crm_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL DEFAULT 'auto',
  status TEXT NOT NULL DEFAULT 'running',
  reason TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT
);

GRANT SELECT ON public.mymia_crm_sync_runs TO authenticated;
GRANT ALL ON public.mymia_crm_sync_runs TO service_role;

ALTER TABLE public.mymia_crm_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros veem execucoes mymia sync" ON public.mymia_crm_sync_runs;
CREATE POLICY "Membros veem execucoes mymia sync"
  ON public.mymia_crm_sync_runs FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX IF NOT EXISTS idx_mymia_sync_runs_ws_started
  ON public.mymia_crm_sync_runs (workspace_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_mymia_lead_links_state
  ON public.mymia_crm_lead_links (workspace_id, last_inbound_at DESC);

-- Estado derivado por contacto: sincronizado / desatualizado / com erro / por confirmar
CREATE OR REPLACE VIEW public.mymia_crm_lead_sync_status
WITH (security_invoker = true) AS
SELECT
  l.id,
  l.workspace_id,
  l.external_lead_id,
  l.lead_id,
  l.external_status,
  l.external_updated_at,
  l.last_inbound_at,
  l.last_checked_at,
  l.attempt_count,
  l.last_error,
  l.last_error_at,
  CASE
    WHEN l.last_error IS NOT NULL
      AND (l.last_inbound_at IS NULL OR l.last_error_at > l.last_inbound_at) THEN 'com_erro'
    WHEN l.last_inbound_at IS NULL THEN 'por_confirmar'
    WHEN l.external_updated_at IS NOT NULL
      AND l.external_updated_at > l.last_inbound_at THEN 'desatualizado'
    ELSE 'sincronizado'
  END AS sync_state
FROM public.mymia_crm_lead_links l;

GRANT SELECT ON public.mymia_crm_lead_sync_status TO authenticated;