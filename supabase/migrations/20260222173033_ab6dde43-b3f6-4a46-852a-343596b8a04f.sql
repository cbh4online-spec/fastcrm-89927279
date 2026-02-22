
-- 1. Create lead_enricher_settings table
CREATE TABLE public.lead_enricher_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  google_enabled BOOLEAN NOT NULL DEFAULT true,
  linkedin_enabled BOOLEAN NOT NULL DEFAULT true,
  webscraping_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_enrich_enabled BOOLEAN NOT NULL DEFAULT false,
  email_validation_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.lead_enricher_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view enricher settings"
  ON public.lead_enricher_settings FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can create enricher settings"
  ON public.lead_enricher_settings FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update enricher settings"
  ON public.lead_enricher_settings FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Trigger for updated_at
CREATE TRIGGER update_lead_enricher_settings_updated_at
  BEFORE UPDATE ON public.lead_enricher_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add email_verified and enrichment_queued_at columns to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS enrichment_queued_at TIMESTAMPTZ DEFAULT NULL;
