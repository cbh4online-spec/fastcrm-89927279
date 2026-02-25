
-- meeting_recordings
CREATE TABLE public.meeting_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  duration_seconds INTEGER,
  file_url TEXT,
  file_size_bytes BIGINT,
  transcription_status TEXT NOT NULL DEFAULT 'pending',
  transcription_language TEXT DEFAULT 'pt',
  ai_summary TEXT,
  ai_action_items JSONB DEFAULT '[]',
  ai_topics JSONB DEFAULT '[]',
  ai_sentiment TEXT,
  speaker_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage meeting recordings"
  ON public.meeting_recordings
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- meeting_transcript_segments
CREATE TABLE public.meeting_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.meeting_recordings(id) ON DELETE CASCADE,
  speaker_label TEXT NOT NULL,
  speaker_role TEXT,
  start_time_ms INTEGER NOT NULL,
  end_time_ms INTEGER NOT NULL,
  content TEXT NOT NULL,
  confidence NUMERIC(4,3),
  is_key_moment BOOLEAN DEFAULT false,
  sentiment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_transcript_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage transcript segments"
  ON public.meeting_transcript_segments
  FOR ALL
  USING (
    recording_id IN (
      SELECT id FROM public.meeting_recordings WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    recording_id IN (
      SELECT id FROM public.meeting_recordings WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- meeting_transcript_highlights
CREATE TABLE public.meeting_transcript_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.meeting_recordings(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES public.meeting_transcript_segments(id) ON DELETE SET NULL,
  highlight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time_ms INTEGER NOT NULL,
  assignee TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_transcript_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage transcript highlights"
  ON public.meeting_transcript_highlights
  FOR ALL
  USING (
    recording_id IN (
      SELECT id FROM public.meeting_recordings WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    recording_id IN (
      SELECT id FROM public.meeting_recordings WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Enable realtime for meeting_recordings
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_recordings;

-- Indexes
CREATE INDEX idx_meeting_recordings_meeting ON public.meeting_recordings(meeting_id);
CREATE INDEX idx_meeting_recordings_workspace ON public.meeting_recordings(workspace_id);
CREATE INDEX idx_transcript_segments_recording ON public.meeting_transcript_segments(recording_id);
CREATE INDEX idx_transcript_highlights_recording ON public.meeting_transcript_highlights(recording_id);
