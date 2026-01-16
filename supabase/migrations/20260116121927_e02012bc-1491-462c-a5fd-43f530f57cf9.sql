
-- Create storage bucket for contact documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-documents', 'contact-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for contact documents bucket
CREATE POLICY "Users can view their workspace documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contact-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload documents to their workspace"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contact-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their workspace documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contact-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM public.workspace_members WHERE user_id = auth.uid()
  )
);
