
-- ============= 1. voice_compliance_settings: campos extra =============
ALTER TABLE public.voice_compliance_settings
  ADD COLUMN IF NOT EXISTS recording_notice_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_download boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_transcription boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_ai_analysis boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS restrict_recording_access boolean NOT NULL DEFAULT true;

ALTER TABLE public.voice_compliance_settings
  ALTER COLUMN retention_days SET DEFAULT 90;

-- ============= 2. voice_call_recordings =============
CREATE TABLE IF NOT EXISTS public.voice_call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  call_log_id uuid NOT NULL REFERENCES public.voice_call_logs(id) ON DELETE CASCADE,
  provider_instance_id uuid,
  provider_name text,
  provider_call_id text,
  provider_recording_id text,
  recording_url text,
  storage_path text,
  storage_provider text NOT NULL DEFAULT 'provider' CHECK (storage_provider IN ('provider','supabase','external')),
  recording_status text NOT NULL DEFAULT 'pending' CHECK (recording_status IN ('pending','available','processing','failed','deleted','expired')),
  duration_seconds integer,
  file_size_bytes bigint,
  mime_type text,
  consent_recorded boolean NOT NULL DEFAULT false,
  consent_method text CHECK (consent_method IS NULL OR consent_method IN ('automatic_notice','manual_confirmation','contractual','legitimate_interest','other')),
  retention_days integer,
  delete_after timestamptz,
  deleted_at timestamptz,
  access_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_recordings_workspace ON public.voice_call_recordings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_call_log ON public.voice_call_recordings(call_log_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_status ON public.voice_call_recordings(workspace_id, recording_status);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_delete_after ON public.voice_call_recordings(delete_after) WHERE delete_after IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_voice_recording_provider ON public.voice_call_recordings(provider_instance_id, provider_recording_id) WHERE provider_recording_id IS NOT NULL;

ALTER TABLE public.voice_call_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage voice_call_recordings"
  ON public.voice_call_recordings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_recordings.workspace_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_recordings.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "service_role full voice_call_recordings"
  ON public.voice_call_recordings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_voice_recordings_updated_at BEFORE UPDATE ON public.voice_call_recordings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============= 3. voice_call_transcriptions =============
CREATE TABLE IF NOT EXISTS public.voice_call_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  call_log_id uuid NOT NULL REFERENCES public.voice_call_logs(id) ON DELETE CASCADE,
  recording_id uuid REFERENCES public.voice_call_recordings(id) ON DELETE SET NULL,
  transcription_status text NOT NULL DEFAULT 'pending' CHECK (transcription_status IN ('pending','processing','completed','failed','skipped')),
  transcription_provider text,
  transcription_model text,
  language text NOT NULL DEFAULT 'pt-PT',
  transcription_text text,
  speaker_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric(5,4),
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_workspace ON public.voice_call_transcriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_call_log ON public.voice_call_transcriptions(call_log_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_status ON public.voice_call_transcriptions(workspace_id, transcription_status);

ALTER TABLE public.voice_call_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage voice_call_transcriptions"
  ON public.voice_call_transcriptions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_transcriptions.workspace_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_transcriptions.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "service_role full voice_call_transcriptions"
  ON public.voice_call_transcriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_voice_transcriptions_updated_at BEFORE UPDATE ON public.voice_call_transcriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============= 4. voice_call_insights =============
CREATE TABLE IF NOT EXISTS public.voice_call_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  call_log_id uuid NOT NULL REFERENCES public.voice_call_logs(id) ON DELETE CASCADE,
  transcription_id uuid REFERENCES public.voice_call_transcriptions(id) ON DELETE SET NULL,
  contact_id uuid,
  lead_id uuid,
  deal_id uuid,
  ticket_id uuid,
  appointment_id uuid,
  agent_id uuid,
  summary text,
  short_summary text,
  intent text,
  sentiment text CHECK (sentiment IS NULL OR sentiment IN ('positive','neutral','negative','urgent')),
  urgency text CHECK (urgency IS NULL OR urgency IN ('low','medium','high','critical')),
  suggested_outcome text,
  suggested_next_action text,
  suggested_reply text,
  suggested_followup jsonb,
  suggested_task jsonb,
  suggested_ticket jsonb,
  suggested_deal jsonb,
  objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  products_mentioned jsonb NOT NULL DEFAULT '[]'::jsonb,
  competitors_mentioned jsonb NOT NULL DEFAULT '[]'::jsonb,
  buying_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  quality_score numeric(5,2),
  commercial_score numeric(5,2),
  support_score numeric(5,2),
  confidence numeric(5,4),
  raw_ai_response jsonb,
  ai_model text,
  ai_provider text,
  processing_seconds numeric(8,3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  analyzed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_voice_insights_workspace ON public.voice_call_insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_voice_insights_call_log ON public.voice_call_insights(call_log_id);
CREATE INDEX IF NOT EXISTS idx_voice_insights_intent ON public.voice_call_insights(workspace_id, intent);
CREATE INDEX IF NOT EXISTS idx_voice_insights_sentiment ON public.voice_call_insights(workspace_id, sentiment);
CREATE INDEX IF NOT EXISTS idx_voice_insights_agent ON public.voice_call_insights(agent_id);

ALTER TABLE public.voice_call_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage voice_call_insights"
  ON public.voice_call_insights FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_insights.workspace_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_insights.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "service_role full voice_call_insights"
  ON public.voice_call_insights FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_voice_insights_updated_at BEFORE UPDATE ON public.voice_call_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============= 5. voice_recording_access_logs =============
CREATE TABLE IF NOT EXISTS public.voice_recording_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recording_id uuid NOT NULL REFERENCES public.voice_call_recordings(id) ON DELETE CASCADE,
  call_log_id uuid NOT NULL REFERENCES public.voice_call_logs(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL CHECK (action IN ('play','download','delete','view_transcription')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_access_logs_workspace ON public.voice_recording_access_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_access_logs_recording ON public.voice_recording_access_logs(recording_id);

ALTER TABLE public.voice_recording_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read voice_recording_access_logs"
  ON public.voice_recording_access_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_recording_access_logs.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "service_role insert voice_recording_access_logs"
  ON public.voice_recording_access_logs FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_role full voice_recording_access_logs"
  ON public.voice_recording_access_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============= 6. Função para emitir eventos para workflow_queue =============
CREATE OR REPLACE FUNCTION public.emit_voice_workflow_event(
  p_workspace_id uuid,
  p_event_type text,
  p_call_log_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workflow_queue (workspace_id, trigger_type, trigger_payload, status, scheduled_at)
  VALUES (
    p_workspace_id,
    p_event_type,
    jsonb_build_object('call_log_id', p_call_log_id) || COALESCE(p_payload, '{}'::jsonb),
    'pending',
    now()
  );
EXCEPTION WHEN OTHERS THEN
  -- Não bloquear inserts/updates se workflow_queue falhar
  RAISE WARNING 'emit_voice_workflow_event failed: %', SQLERRM;
END;
$$;

-- ============= 7. Trigger: emite eventos automáticos =============
CREATE OR REPLACE FUNCTION public.voice_recordings_emit_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.recording_status = 'available' THEN
    PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.recording_available', NEW.call_log_id,
      jsonb_build_object('recording_id', NEW.id, 'provider_name', NEW.provider_name));
  ELSIF TG_OP = 'UPDATE' AND NEW.recording_status = 'available' AND OLD.recording_status <> 'available' THEN
    PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.recording_available', NEW.call_log_id,
      jsonb_build_object('recording_id', NEW.id, 'provider_name', NEW.provider_name));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_voice_recordings_emit ON public.voice_call_recordings;
CREATE TRIGGER trg_voice_recordings_emit
  AFTER INSERT OR UPDATE OF recording_status ON public.voice_call_recordings
  FOR EACH ROW EXECUTE FUNCTION public.voice_recordings_emit_events();

CREATE OR REPLACE FUNCTION public.voice_transcriptions_emit_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transcription_status = 'completed' AND (OLD IS NULL OR OLD.transcription_status <> 'completed') THEN
    PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.transcribed', NEW.call_log_id,
      jsonb_build_object('transcription_id', NEW.id));
  ELSIF NEW.transcription_status = 'failed' AND (OLD IS NULL OR OLD.transcription_status <> 'failed') THEN
    PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.transcription_failed', NEW.call_log_id,
      jsonb_build_object('transcription_id', NEW.id, 'error', NEW.error));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_voice_transcriptions_emit ON public.voice_call_transcriptions;
CREATE TRIGGER trg_voice_transcriptions_emit
  AFTER INSERT OR UPDATE OF transcription_status ON public.voice_call_transcriptions
  FOR EACH ROW EXECUTE FUNCTION public.voice_transcriptions_emit_events();

CREATE OR REPLACE FUNCTION public.voice_insights_emit_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
BEGIN
  v_payload := jsonb_build_object('insight_id', NEW.id, 'intent', NEW.intent, 'sentiment', NEW.sentiment, 'urgency', NEW.urgency);
  PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.analyzed', NEW.call_log_id, v_payload);

  IF NEW.intent IS NOT NULL THEN
    PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.intent_detected', NEW.call_log_id, v_payload);
  END IF;
  IF jsonb_array_length(COALESCE(NEW.objections, '[]'::jsonb)) > 0 THEN
    PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.objection_detected', NEW.call_log_id,
      v_payload || jsonb_build_object('objections', NEW.objections));
  END IF;
  IF jsonb_array_length(COALESCE(NEW.buying_signals, '[]'::jsonb)) > 0 THEN
    PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.buying_signal_detected', NEW.call_log_id,
      v_payload || jsonb_build_object('buying_signals', NEW.buying_signals));
  END IF;
  IF NEW.suggested_followup IS NOT NULL THEN
    PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.followup_suggested', NEW.call_log_id, v_payload);
  END IF;
  IF NEW.suggested_ticket IS NOT NULL THEN
    PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.ticket_suggested', NEW.call_log_id, v_payload);
  END IF;
  IF NEW.suggested_deal IS NOT NULL THEN
    PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.deal_suggested', NEW.call_log_id, v_payload);
  END IF;
  IF NEW.quality_score IS NOT NULL AND NEW.quality_score < 50 THEN
    PERFORM emit_voice_workflow_event(NEW.workspace_id, 'voice.call.low_quality_score', NEW.call_log_id,
      v_payload || jsonb_build_object('quality_score', NEW.quality_score));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_voice_insights_emit ON public.voice_call_insights;
CREATE TRIGGER trg_voice_insights_emit
  AFTER INSERT ON public.voice_call_insights
  FOR EACH ROW EXECUTE FUNCTION public.voice_insights_emit_events();
