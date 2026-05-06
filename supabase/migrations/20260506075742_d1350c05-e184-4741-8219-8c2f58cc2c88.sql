-- whatsapp_audio_insights: dedicated table for audio transcription + AI analysis
CREATE TABLE IF NOT EXISTS public.whatsapp_audio_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  contact_id uuid,
  media_url text NOT NULL,
  duration_seconds integer,
  language text NOT NULL DEFAULT 'pt-PT',
  transcription_status text NOT NULL DEFAULT 'pending',
  transcription_text text,
  transcription_provider text,
  transcription_error text,
  transcription_completed_at timestamptz,
  summary text,
  intent text,
  sentiment text,
  urgency text,
  next_action text,
  suggested_reply text,
  suggested_task_title text,
  suggested_task_description text,
  suggested_ticket_title text,
  suggested_ticket_priority text,
  suggested_deal_action text,
  confidence numeric,
  raw_ai_response jsonb,
  ai_analysis_completed_at timestamptz,
  transcription_cost_estimate numeric,
  ai_analysis_cost_estimate numeric,
  processing_seconds integer,
  provider_model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT whatsapp_audio_insights_message_unique UNIQUE (message_id),
  CONSTRAINT whatsapp_audio_insights_status_check CHECK (
    transcription_status IN ('pending','processing','completed','failed','skipped')
  )
);

CREATE INDEX IF NOT EXISTS idx_wai_workspace ON public.whatsapp_audio_insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wai_conversation ON public.whatsapp_audio_insights(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wai_status ON public.whatsapp_audio_insights(transcription_status);

ALTER TABLE public.whatsapp_audio_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view audio insights"
  ON public.whatsapp_audio_insights FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert audio insights"
  ON public.whatsapp_audio_insights FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update audio insights"
  ON public.whatsapp_audio_insights FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete audio insights"
  ON public.whatsapp_audio_insights FOR DELETE
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Super admins full access audio insights"
  ON public.whatsapp_audio_insights FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER trg_wai_updated_at
  BEFORE UPDATE ON public.whatsapp_audio_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_processing_logs: technical logs for AI-related operations
CREATE TABLE IF NOT EXISTS public.ai_processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid,
  provider text,
  operation text NOT NULL,
  request_payload jsonb,
  response_payload jsonb,
  success boolean NOT NULL DEFAULT false,
  error text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apl_workspace ON public.ai_processing_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apl_source ON public.ai_processing_logs(source_type, source_id);

ALTER TABLE public.ai_processing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view AI processing logs"
  ON public.ai_processing_logs FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Super admins full access AI logs"
  ON public.ai_processing_logs FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));