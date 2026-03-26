
-- Command Center sessions table for persistent history
CREATE TABLE public.command_center_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  intent TEXT,
  entity_id TEXT,
  entity_name TEXT,
  response_summary TEXT,
  response_confidence INTEGER,
  response_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_cc_sessions_workspace_user ON public.command_center_sessions(workspace_id, user_id, created_at DESC);

-- RLS
ALTER TABLE public.command_center_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own sessions
CREATE POLICY "Users can read own sessions"
  ON public.command_center_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.command_center_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
