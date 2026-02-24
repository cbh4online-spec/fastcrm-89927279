
-- Custom Objects: define user-created object types
CREATE TABLE public.custom_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'box',
  color TEXT DEFAULT '#6366f1',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

ALTER TABLE public.custom_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom objects in their workspace"
ON public.custom_objects FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert custom objects in their workspace"
ON public.custom_objects FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update custom objects in their workspace"
ON public.custom_objects FOR UPDATE TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete custom objects in their workspace"
ON public.custom_objects FOR DELETE TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- Object Records: store records for custom objects (JSONB data)
CREATE TABLE public.object_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  object_id UUID NOT NULL REFERENCES public.custom_objects(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.object_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view object records in their workspace"
ON public.object_records FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert object records in their workspace"
ON public.object_records FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update object records in their workspace"
ON public.object_records FOR UPDATE TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete object records in their workspace"
ON public.object_records FOR DELETE TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- Object Relationships: link records across objects
CREATE TABLE public.object_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_object_id UUID NOT NULL REFERENCES public.custom_objects(id) ON DELETE CASCADE,
  target_object_id UUID NOT NULL REFERENCES public.custom_objects(id) ON DELETE CASCADE,
  source_record_id UUID NOT NULL REFERENCES public.object_records(id) ON DELETE CASCADE,
  target_record_id UUID NOT NULL REFERENCES public.object_records(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'related',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.object_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage object relationships in their workspace"
ON public.object_relationships FOR ALL TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- Indexes
CREATE INDEX idx_object_records_object_id ON public.object_records(object_id);
CREATE INDEX idx_object_records_workspace_id ON public.object_records(workspace_id);
CREATE INDEX idx_object_records_data ON public.object_records USING gin(data);
CREATE INDEX idx_object_relationships_source ON public.object_relationships(source_record_id);
CREATE INDEX idx_object_relationships_target ON public.object_relationships(target_record_id);
CREATE INDEX idx_custom_objects_workspace ON public.custom_objects(workspace_id);
