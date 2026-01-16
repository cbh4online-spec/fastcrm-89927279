-- Industry Labels (modelos de negócio) por workspace
CREATE TABLE public.workspace_industry_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  industry_type TEXT NOT NULL DEFAULT 'default',
  entity_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(workspace_id, industry_type)
);

-- Histórico de importações
CREATE TABLE public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  total_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  skip_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  column_mapping JSONB DEFAULT '{}'::jsonb,
  field_transformations JSONB DEFAULT '{}'::jsonb,
  conflict_policy TEXT DEFAULT 'ask',
  errors JSONB DEFAULT '[]'::jsonb,
  created_fields JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.workspace_industry_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_industry_labels
CREATE POLICY "Users can view their workspace industry labels"
ON public.workspace_industry_labels
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspace_industry_labels.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert industry labels for their workspace"
ON public.workspace_industry_labels
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspace_industry_labels.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can update their workspace industry labels"
ON public.workspace_industry_labels
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspace_industry_labels.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can delete their workspace industry labels"
ON public.workspace_industry_labels
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspace_industry_labels.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  )
);

-- RLS Policies for import_history
CREATE POLICY "Users can view their workspace import history"
ON public.import_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = import_history.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert import history for their workspace"
ON public.import_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = import_history.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their workspace import history"
ON public.import_history
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = import_history.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_workspace_industry_labels_updated_at
BEFORE UPDATE ON public.workspace_industry_labels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();