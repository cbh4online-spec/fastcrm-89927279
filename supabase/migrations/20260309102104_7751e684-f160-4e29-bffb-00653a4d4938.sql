
-- Add AI columns to flow_steps
ALTER TABLE public.flow_steps
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
  ADD COLUMN IF NOT EXISTS ai_input_source TEXT,
  ADD COLUMN IF NOT EXISTS ai_output_variable TEXT;

-- Create meeting_ai_analysis table
CREATE TABLE IF NOT EXISTS public.meeting_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.meeting_recordings(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  objections_detected JSONB DEFAULT '[]'::jsonb,
  buying_signals JSONB DEFAULT '[]'::jsonb,
  competitor_mentions JSONB DEFAULT '[]'::jsonb,
  follow_up_suggestions JSONB DEFAULT '[]'::jsonb,
  talk_ratio JSONB DEFAULT '{}'::jsonb,
  engagement_score NUMERIC,
  deal_impact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.meeting_ai_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view meeting AI analysis"
  ON public.meeting_ai_analysis FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Workspace members can insert meeting AI analysis"
  ON public.meeting_ai_analysis FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Workspace members can update meeting AI analysis"
  ON public.meeting_ai_analysis FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
