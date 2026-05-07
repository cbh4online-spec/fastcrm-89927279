
-- 1) Storage bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-recordings', 'voice-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- RLS storage policies (workspace_id no primeiro segmento do path)
CREATE POLICY "voice_recordings_select_workspace"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-recordings'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "voice_recordings_insert_workspace"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-recordings'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "voice_recordings_delete_workspace"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'voice-recordings'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id::text = (storage.foldername(name))[1]
  )
);

-- 2) Extensão de voice_call_logs
ALTER TABLE public.voice_call_logs
  ADD COLUMN IF NOT EXISTS recording_storage_path text,
  ADD COLUMN IF NOT EXISTS recording_mime_type text,
  ADD COLUMN IF NOT EXISTS recording_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS transcription_language text,
  ADD COLUMN IF NOT EXISTS transcription_model text,
  ADD COLUMN IF NOT EXISTS transcription_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS intelligence_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_score integer CHECK (quality_score IS NULL OR (quality_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS quality_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS next_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance_consent_detected boolean,
  ADD COLUMN IF NOT EXISTS compliance_forbidden_hits jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance_required_missing jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intelligence_model text,
  ADD COLUMN IF NOT EXISTS intelligence_error text,
  ADD COLUMN IF NOT EXISTS transcription_error text;

CREATE INDEX IF NOT EXISTS voice_call_logs_workspace_status_idx
  ON public.voice_call_logs (workspace_id, transcription_status, recording_status);

CREATE INDEX IF NOT EXISTS voice_call_logs_compliance_review_idx
  ON public.voice_call_logs (workspace_id, compliance_review_required)
  WHERE compliance_review_required = true;

-- 3) voice_call_intelligence (segmentos)
CREATE TABLE IF NOT EXISTS public.voice_call_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  call_log_id uuid NOT NULL REFERENCES public.voice_call_logs(id) ON DELETE CASCADE,
  segment_index integer NOT NULL,
  speaker text,
  start_seconds numeric(10,3),
  end_seconds numeric(10,3),
  text text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (call_log_id, segment_index)
);

CREATE INDEX IF NOT EXISTS voice_call_intelligence_call_idx
  ON public.voice_call_intelligence (call_log_id, segment_index);
CREATE INDEX IF NOT EXISTS voice_call_intelligence_workspace_idx
  ON public.voice_call_intelligence (workspace_id);

ALTER TABLE public.voice_call_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vci_select_members"
ON public.voice_call_intelligence FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.workspace_id = voice_call_intelligence.workspace_id
  )
);

CREATE POLICY "vci_service_role_all"
ON public.voice_call_intelligence FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 4) voice_compliance_keywords
CREATE TABLE IF NOT EXISTS public.voice_compliance_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('forbidden','required','consent')),
  phrase text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vck_workspace_kind_idx
  ON public.voice_compliance_keywords (workspace_id, kind, active);

ALTER TABLE public.voice_compliance_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vck_select_members"
ON public.voice_compliance_keywords FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.workspace_id = voice_compliance_keywords.workspace_id
  )
);

CREATE POLICY "vck_admin_write"
ON public.voice_compliance_keywords FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id = voice_compliance_keywords.workspace_id
      AND wm.role IN ('owner','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id = voice_compliance_keywords.workspace_id
      AND wm.role IN ('owner','admin')
  )
);

CREATE TRIGGER vck_set_updated_at
BEFORE UPDATE ON public.voice_compliance_keywords
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
