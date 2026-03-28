
CREATE TABLE public.workspace_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT NULL,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

ALTER TABLE public.workspace_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace tags"
  ON public.workspace_tags FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert workspace tags"
  ON public.workspace_tags FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update workspace tags"
  ON public.workspace_tags FOR UPDATE
  TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete workspace tags"
  ON public.workspace_tags FOR DELETE
  TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX idx_workspace_tags_workspace ON public.workspace_tags(workspace_id);
