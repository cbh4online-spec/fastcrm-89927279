DROP POLICY IF EXISTS "Authenticated users can upload rfq pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can read rfq pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can delete deliverables" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can upload deliverables" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can view deliverables" ON storage.objects;
DROP POLICY IF EXISTS "hr_cvs_select" ON storage.objects;
DROP POLICY IF EXISTS "workspace members delete rfq quote files" ON storage.objects;
DROP POLICY IF EXISTS "workspace members read rfq quote files" ON storage.objects;
DROP POLICY IF EXISTS "workspace members upload rfq quote files" ON storage.objects;

CREATE POLICY "ws_scoped_private_files_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('hr-cvs','rfq-pdfs','rfq-quote-files','product-deliverables')
  AND ((storage.foldername(name))[1] IN (SELECT w::text FROM public.get_user_workspace_ids() w)
       OR (SELECT public.is_super_admin(auth.uid()))
       OR (bucket_id = 'hr-cvs' AND owner_id = (SELECT auth.uid())::text)));

CREATE POLICY "ws_scoped_private_files_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('rfq-pdfs','rfq-quote-files','product-deliverables')
  AND (storage.foldername(name))[1] IN (SELECT w::text FROM public.get_user_workspace_ids() w));

CREATE POLICY "ws_scoped_private_files_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('rfq-pdfs','rfq-quote-files','product-deliverables')
  AND (storage.foldername(name))[1] IN (SELECT w::text FROM public.get_user_workspace_ids() w))
WITH CHECK (bucket_id IN ('rfq-pdfs','rfq-quote-files','product-deliverables')
  AND (storage.foldername(name))[1] IN (SELECT w::text FROM public.get_user_workspace_ids() w));

CREATE POLICY "ws_scoped_private_files_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('hr-cvs','rfq-pdfs','rfq-quote-files','product-deliverables')
  AND ((storage.foldername(name))[1] IN (SELECT w::text FROM public.get_user_workspace_ids() w)
       OR (SELECT public.is_super_admin(auth.uid()))));