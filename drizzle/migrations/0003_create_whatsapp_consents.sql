CREATE TABLE IF NOT EXISTS public.whatsapp_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phone text NOT NULL,
  contact_id uuid NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id uuid NULL REFERENCES public.leads(id) ON DELETE SET NULL,
  company_id uuid NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'granted' CHECK (status IN ('granted','revoked')),
  consent_category text NOT NULL DEFAULT 'marketing' CHECK (consent_category IN ('marketing','transactional','all')),
  consent_text text NOT NULL,
  consent_version text NOT NULL DEFAULT 'v1',
  source text NOT NULL DEFAULT 'manual_import' CHECK (source IN ('form','landing_page','email','whatsapp_inbound','manual_import')),
  source_reference text NULL,
  granted_at timestamptz NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  ip_address text NULL,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_consents_ws_phone_cat
  ON public.whatsapp_consents (workspace_id, phone, consent_category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_consents_phone ON public.whatsapp_consents (phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_consents_status ON public.whatsapp_consents (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_consents_contact ON public.whatsapp_consents (contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_consents_lead ON public.whatsapp_consents (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_consents_company ON public.whatsapp_consents (company_id) WHERE company_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_consents TO authenticated;
GRANT ALL ON public.whatsapp_consents TO service_role;

ALTER TABLE public.whatsapp_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace whatsapp consents"
ON public.whatsapp_consents FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can insert workspace whatsapp consents"
ON public.whatsapp_consents FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can update workspace whatsapp consents"
ON public.whatsapp_consents FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Managers can delete workspace whatsapp consents"
ON public.whatsapp_consents FOR DELETE TO authenticated
USING (can_manage_workspace(workspace_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.has_whatsapp_consent(_workspace_id uuid, _phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.whatsapp_consents c
    WHERE c.workspace_id = _workspace_id
      AND regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
      AND c.status = 'granted'
      AND c.consent_category IN ('marketing','all')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.whatsapp_optouts o
    WHERE o.workspace_id = _workspace_id
      AND regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
  )
$$;

CREATE OR REPLACE FUNCTION public.set_whatsapp_consents_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_whatsapp_consents_updated_at ON public.whatsapp_consents;
CREATE TRIGGER trg_whatsapp_consents_updated_at
BEFORE UPDATE ON public.whatsapp_consents
FOR EACH ROW EXECUTE FUNCTION public.set_whatsapp_consents_updated_at();