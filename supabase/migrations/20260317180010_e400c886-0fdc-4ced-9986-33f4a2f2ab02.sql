
-- Table for prospecting search history
CREATE TABLE public.prospecting_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('web_search', 'google_local')),
  query TEXT NOT NULL,
  location TEXT,
  category TEXT,
  results_count INT NOT NULL DEFAULT 0,
  imported_count INT NOT NULL DEFAULT 0,
  result_identifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_prospecting_search_history_workspace ON public.prospecting_search_history(workspace_id, search_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.prospecting_search_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own workspace searches"
  ON public.prospecting_search_history FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert searches"
  ON public.prospecting_search_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
