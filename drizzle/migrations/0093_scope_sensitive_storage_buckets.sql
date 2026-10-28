DROP POLICY IF EXISTS "Members can view context attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload context attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete context attachments" ON storage.objects;
CREATE POLICY "Members can view context attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'context-attachments' AND (storage.foldername(name))[1] IN (SELECT w::text FROM public.get_user_workspace_ids() w));
CREATE POLICY "Members can upload context attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'context-attachments' AND (storage.foldername(name))[1] IN (SELECT w::text FROM public.get_user_workspace_ids() w));
CREATE POLICY "Members can delete context attachments" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'context-attachments' AND (storage.foldername(name))[1] IN (SELECT w::text FROM public.get_user_workspace_ids() w));

DROP POLICY IF EXISTS "Users can view own workspace documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own workspace documents" ON storage.objects;
CREATE POLICY "Users can view own workspace documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'document-intelligence' AND (storage.foldername(name))[1] IN (SELECT w::text FROM public.get_user_workspace_ids() w));
CREATE POLICY "Users can delete own workspace documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'document-intelligence' AND (storage.foldername(name))[1] IN (SELECT w::text FROM public.get_user_workspace_ids() w));

DROP POLICY IF EXISTS "users can read bug report assets" ON storage.objects;
DROP POLICY IF EXISTS "users can upload bug report assets" ON storage.objects;
CREATE POLICY "users can read bug report assets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bug-report-assets' AND ((storage.foldername(name))[1] = (select auth.uid()::text) OR public.is_super_admin(auth.uid())));
CREATE POLICY "users can upload bug report assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bug-report-assets' AND (storage.foldername(name))[1] = (select auth.uid()::text));

DROP POLICY IF EXISTS builder_site_assets_member_insert ON storage.objects;
DROP POLICY IF EXISTS builder_site_assets_member_update ON storage.objects;
CREATE POLICY builder_site_assets_member_insert ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'builder-site-assets');
CREATE POLICY builder_site_assets_member_update ON storage.objects FOR UPDATE TO service_role USING (bucket_id = 'builder-site-assets');