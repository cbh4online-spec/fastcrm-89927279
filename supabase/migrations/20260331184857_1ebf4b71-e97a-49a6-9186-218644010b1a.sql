-- Table for async AI generation jobs
CREATE TABLE public.ebook_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ebook_id UUID REFERENCES public.ebooks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  current_step TEXT,
  steps_completed TEXT[] DEFAULT '{}',
  total_steps INTEGER DEFAULT 6,
  progress INTEGER DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  result JSONB DEFAULT '{}',
  error_message TEXT,
  error_step TEXT,
  retry_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ebook_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Workspace members can view jobs
CREATE POLICY "Workspace members can view generation jobs"
  ON public.ebook_generation_jobs FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ));

-- Authenticated users can create jobs in their workspace
CREATE POLICY "Authenticated users can create generation jobs"
  ON public.ebook_generation_jobs FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ));

-- Workspace members can update their jobs
CREATE POLICY "Workspace members can update generation jobs"
  ON public.ebook_generation_jobs FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ));

-- Enable realtime for polling
ALTER PUBLICATION supabase_realtime ADD TABLE public.ebook_generation_jobs;