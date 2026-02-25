
CREATE TABLE public.workspace_call_intelligence_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auto_record_mode TEXT NOT NULL DEFAULT 'none',
  transcription_enabled BOOLEAN NOT NULL DEFAULT true,
  transcription_language TEXT NOT NULL DEFAULT 'pt',
  ai_summary_enabled BOOLEAN NOT NULL DEFAULT true,
  consent_notification BOOLEAN NOT NULL DEFAULT true,
  crm_auto_link BOOLEAN NOT NULL DEFAULT true,
  retention_days INTEGER NOT NULL DEFAULT 90,
  default_insights_template TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_call_intel_unique UNIQUE (workspace_id)
);

ALTER TABLE public.workspace_call_intelligence_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_call_intel_select" ON public.workspace_call_intelligence_config
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_call_intel_insert" ON public.workspace_call_intelligence_config
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_call_intel_update" ON public.workspace_call_intelligence_config
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );
