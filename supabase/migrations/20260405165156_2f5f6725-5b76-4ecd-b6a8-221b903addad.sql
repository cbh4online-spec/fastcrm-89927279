
-- SDR Campaigns table
CREATE TABLE public.sdr_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  sequence_id UUID,
  ai_employee_id UUID,
  target_filters JSONB DEFAULT '{}'::jsonb,
  ab_testing_config JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  total_enrolled INTEGER NOT NULL DEFAULT 0,
  total_replied INTEGER NOT NULL DEFAULT 0,
  total_meetings INTEGER NOT NULL DEFAULT 0,
  total_converted INTEGER NOT NULL DEFAULT 0,
  auto_enroll_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_enroll_min_score INTEGER DEFAULT 70,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sdr_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sdr_campaigns_select" ON public.sdr_campaigns
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "sdr_campaigns_insert" ON public.sdr_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "sdr_campaigns_update" ON public.sdr_campaigns
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "sdr_campaigns_delete" ON public.sdr_campaigns
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX idx_sdr_campaigns_workspace ON public.sdr_campaigns(workspace_id);
CREATE INDEX idx_sdr_campaigns_status ON public.sdr_campaigns(status);

-- SDR Enrollments table
CREATE TABLE public.sdr_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.sdr_campaigns(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  prospect_id UUID,
  lead_id UUID,
  contact_id UUID,
  prospect_name TEXT,
  prospect_email TEXT,
  prospect_phone TEXT,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'enriching', 'sequenced', 'replied', 'positive_reply', 'meeting_set', 'converted', 'opted_out', 'failed')),
  channel TEXT DEFAULT 'email',
  sequence_enrollment_id UUID,
  enrichment_data JSONB DEFAULT '{}'::jsonb,
  message_variant TEXT DEFAULT 'A',
  reply_detected_at TIMESTAMPTZ,
  meeting_set_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sdr_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sdr_enrollments_select" ON public.sdr_enrollments
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "sdr_enrollments_insert" ON public.sdr_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "sdr_enrollments_update" ON public.sdr_enrollments
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "sdr_enrollments_delete" ON public.sdr_enrollments
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX idx_sdr_enrollments_campaign ON public.sdr_enrollments(campaign_id);
CREATE INDEX idx_sdr_enrollments_workspace ON public.sdr_enrollments(workspace_id);
CREATE INDEX idx_sdr_enrollments_status ON public.sdr_enrollments(status);
CREATE INDEX idx_sdr_enrollments_prospect ON public.sdr_enrollments(prospect_id);

-- Triggers for updated_at
CREATE TRIGGER update_sdr_campaigns_updated_at
  BEFORE UPDATE ON public.sdr_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sdr_enrollments_updated_at
  BEFORE UPDATE ON public.sdr_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
