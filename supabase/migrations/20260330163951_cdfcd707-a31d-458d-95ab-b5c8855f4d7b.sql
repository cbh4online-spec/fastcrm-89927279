
-- ============================================
-- Communication Attribution Engine
-- ============================================

-- Attribution settings per workspace
CREATE TABLE public.communication_attribution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  default_model TEXT NOT NULL DEFAULT 'last_touch',
  attribution_window_days INT NOT NULL DEFAULT 7,
  allow_email_fallback BOOLEAN NOT NULL DEFAULT true,
  include_assists BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.communication_attribution_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view attribution settings"
  ON public.communication_attribution_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can upsert attribution settings"
  ON public.communication_attribution_settings FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update attribution settings"
  ON public.communication_attribution_settings FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Main attribution records
CREATE TABLE public.communication_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID,
  template_id UUID,
  sequence_id UUID,
  sequence_step_id UUID,
  enrollment_id UUID,
  communication_job_id UUID,
  channel TEXT,
  provider TEXT,
  context_type TEXT,
  context_id UUID,
  conversion_type TEXT NOT NULL,
  conversion_id UUID NOT NULL,
  conversion_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  attribution_model TEXT NOT NULL DEFAULT 'last_touch',
  attribution_weight NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  touch_type TEXT NOT NULL DEFAULT 'direct',
  sent_at TIMESTAMPTZ,
  conversion_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversion_id, conversion_type, attribution_model, template_id, sequence_step_id)
);

ALTER TABLE public.communication_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view attributions"
  ON public.communication_attributions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role can insert attributions"
  ON public.communication_attributions FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update attributions"
  ON public.communication_attributions FOR UPDATE TO service_role
  USING (true);

-- Indexes
CREATE INDEX idx_comm_attr_workspace_type ON public.communication_attributions(workspace_id, conversion_type);
CREATE INDEX idx_comm_attr_template ON public.communication_attributions(template_id);
CREATE INDEX idx_comm_attr_sequence ON public.communication_attributions(sequence_id);
CREATE INDEX idx_comm_attr_contact ON public.communication_attributions(contact_id);
CREATE INDEX idx_comm_attr_conversion ON public.communication_attributions(conversion_id);
CREATE INDEX idx_comm_attr_step ON public.communication_attributions(sequence_step_id);
