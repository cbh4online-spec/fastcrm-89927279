
-- Create entity_documents table
CREATE TABLE public.entity_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'company')),
  entity_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'Outro',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_entity_documents_lookup ON public.entity_documents (entity_type, entity_id);
CREATE INDEX idx_entity_documents_workspace ON public.entity_documents (workspace_id);

-- Enable RLS
ALTER TABLE public.entity_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies: workspace members can CRUD
CREATE POLICY "Workspace members can view entity documents"
  ON public.entity_documents FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert entity documents"
  ON public.entity_documents FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete entity documents"
  ON public.entity_documents FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Storage bucket for entity documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('entity-documents', 'entity-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload entity documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'entity-documents');

CREATE POLICY "Anyone can view entity documents"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'entity-documents');

CREATE POLICY "Authenticated users can delete entity documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'entity-documents');
