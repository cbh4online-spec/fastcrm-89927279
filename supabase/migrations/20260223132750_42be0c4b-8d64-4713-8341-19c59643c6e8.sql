
-- Create storage_upload_intents table
CREATE TABLE public.storage_upload_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'product-images',
  storage_path_tmp TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'uploaded', 'expired', 'promoted')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX idx_upload_intents_workspace ON public.storage_upload_intents(workspace_id);
CREATE INDEX idx_upload_intents_status ON public.storage_upload_intents(status, expires_at);

-- Enable RLS
ALTER TABLE public.storage_upload_intents ENABLE ROW LEVEL SECURITY;

-- SELECT: workspace members can see intents in their workspace
CREATE POLICY "Workspace members can view upload intents"
ON public.storage_upload_intents
FOR SELECT
USING (public.is_workspace_member(workspace_id, auth.uid()));

-- UPDATE: workspace members can confirm upload
CREATE POLICY "Workspace members can confirm upload"
ON public.storage_upload_intents
FOR UPDATE
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (status = 'uploaded');

-- Trigger for updated_at
CREATE TRIGGER update_storage_upload_intents_updated_at
BEFORE UPDATE ON public.storage_upload_intents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
