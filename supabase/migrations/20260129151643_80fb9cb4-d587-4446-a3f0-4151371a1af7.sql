-- Create storage bucket for knowledge base documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-documents',
  'knowledge-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for knowledge-documents bucket
CREATE POLICY "Users can upload documents to knowledge base"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-documents'
  AND (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members 
      WHERE workspace_id::text = (storage.foldername(name))[1]
    )
    OR public.is_super_admin(auth.uid())
  )
);

CREATE POLICY "Users can view documents in their workspace"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-documents'
  AND (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members 
      WHERE workspace_id::text = (storage.foldername(name))[1]
    )
    OR public.is_super_admin(auth.uid())
  )
);

CREATE POLICY "Users can delete documents in their workspace"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-documents'
  AND (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members 
      WHERE workspace_id::text = (storage.foldername(name))[1]
    )
    OR public.is_super_admin(auth.uid())
  )
);