-- Ponte de sincronização entre o CRM do mymia.world e o FastCRM (leads por workspace).
-- Aditiva: nada existente é alterado.

CREATE TABLE IF NOT EXISTS public.mymia_crm_sync_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  inbound_enabled boolean NOT NULL DEFAULT true,
  outbound_enabled boolean NOT NULL DEFAULT false,
  outbound_endpoint_url text,
  default_source text NOT NULL DEFAULT 'mymia_crm',
  default_tags text[] NOT NULL DEFAULT ARRAY['mymia','crm']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mymia_crm_sync_settings TO authenticated;
GRANT ALL ON public.mymia_crm_sync_settings TO service_role;
ALTER TABLE public.mymia_crm_sync_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem configuracao mymia sync"
ON public.mymia_crm_sync_settings FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins criam configuracao mymia sync"
ON public.mymia_crm_sync_settings FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins atualizam configuracao mymia sync"
ON public.mymia_crm_sync_settings FOR UPDATE TO authenticated
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Ligação estável entre a lead do mymia.world (crm_leads.id) e a lead do FastCRM.
CREATE TABLE IF NOT EXISTS public.mymia_crm_lead_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  external_lead_id text NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  external_status text,
  external_updated_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mymia_crm_lead_links_external_unique
  ON public.mymia_crm_lead_links (workspace_id, external_lead_id);
CREATE INDEX IF NOT EXISTS mymia_crm_lead_links_lead_idx
  ON public.mymia_crm_lead_links (lead_id);

GRANT SELECT ON public.mymia_crm_lead_links TO authenticated;
GRANT ALL ON public.mymia_crm_lead_links TO service_role;
ALTER TABLE public.mymia_crm_lead_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem ligacoes mymia"
ON public.mymia_crm_lead_links FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Registo de auditoria de cada operação de sincronização.
CREATE TABLE IF NOT EXISTS public.mymia_crm_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  action text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok','skipped','error')),
  external_lead_id text,
  lead_id uuid,
  error text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mymia_crm_sync_logs_ws_idx
  ON public.mymia_crm_sync_logs (workspace_id, created_at DESC);

GRANT SELECT ON public.mymia_crm_sync_logs TO authenticated;
GRANT ALL ON public.mymia_crm_sync_logs TO service_role;
ALTER TABLE public.mymia_crm_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem registos mymia sync"
ON public.mymia_crm_sync_logs FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER trg_mymia_crm_sync_settings_updated_at
  BEFORE UPDATE ON public.mymia_crm_sync_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_mymia_crm_lead_links_updated_at
  BEFORE UPDATE ON public.mymia_crm_lead_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();