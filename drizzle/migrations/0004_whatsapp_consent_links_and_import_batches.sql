-- Links públicos de opt-in WhatsApp (token opaco, sem expor IDs internos)
CREATE TABLE IF NOT EXISTS public.whatsapp_consent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  label text NOT NULL,
  brand_name text,
  campaign_reference text,
  consent_category text NOT NULL DEFAULT 'marketing'
    CHECK (consent_category IN ('marketing','transactional','all')),
  consent_text text NOT NULL,
  consent_version text NOT NULL DEFAULT 'v1',
  privacy_policy_url text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  submission_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_consent_links_ws ON public.whatsapp_consent_links(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_consent_links TO authenticated;
GRANT ALL ON public.whatsapp_consent_links TO service_role;

ALTER TABLE public.whatsapp_consent_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view workspace consent links"
  ON public.whatsapp_consent_links FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members insert workspace consent links"
  ON public.whatsapp_consent_links FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members update workspace consent links"
  ON public.whatsapp_consent_links FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Managers delete workspace consent links"
  ON public.whatsapp_consent_links FOR DELETE TO authenticated
  USING (public.can_manage_workspace(workspace_id, auth.uid()));

-- Auditoria de importações de consentimento
CREATE TABLE IF NOT EXISTS public.whatsapp_consent_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_name text,
  dry_run boolean NOT NULL DEFAULT true,
  total_rows integer NOT NULL DEFAULT 0,
  accepted_rows integer NOT NULL DEFAULT 0,
  rejected_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  existing_rows integer NOT NULL DEFAULT 0,
  without_lead_rows integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_consent_batches_ws
  ON public.whatsapp_consent_import_batches(workspace_id, created_at DESC);

GRANT SELECT, INSERT ON public.whatsapp_consent_import_batches TO authenticated;
GRANT ALL ON public.whatsapp_consent_import_batches TO service_role;

ALTER TABLE public.whatsapp_consent_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view workspace consent import batches"
  ON public.whatsapp_consent_import_batches FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members insert workspace consent import batches"
  ON public.whatsapp_consent_import_batches FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
