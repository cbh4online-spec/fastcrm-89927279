
CREATE TABLE public.hr_talent_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  search_type text NOT NULL DEFAULT 'candidate',
  search_query text NOT NULL,
  source_url text,
  source_platform text,
  title text,
  description text,
  location text,
  skills text[] DEFAULT '{}',
  raw_content text,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  imported_as text,
  imported_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_talent_results_workspace ON public.hr_talent_results(workspace_id);
CREATE INDEX idx_hr_talent_results_status ON public.hr_talent_results(workspace_id, status);
CREATE INDEX idx_hr_talent_results_type ON public.hr_talent_results(workspace_id, search_type);

ALTER TABLE public.hr_talent_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view talent results"
ON public.hr_talent_results FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can insert talent results"
ON public.hr_talent_results FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can update talent results"
ON public.hr_talent_results FOR UPDATE TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE TRIGGER update_hr_talent_results_updated_at
BEFORE UPDATE ON public.hr_talent_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
