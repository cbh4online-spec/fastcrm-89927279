DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, cmd, qual, with_check FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND cmd IN ('INSERT','UPDATE','DELETE')
      AND policyname IN ('Auth upload landing-assets','Authenticated upload to email-assets','Authenticated users can delete avatars','Authenticated users can delete bio assets','Authenticated users can delete category images','Authenticated users can delete community assets','Authenticated users can delete ebook assets','Authenticated users can delete entity documents','Authenticated users can delete event covers','Authenticated users can delete hr avatars','Authenticated users can delete product documents','Authenticated users can delete product images','Authenticated users can delete store assets','Authenticated users can update avatars','Authenticated users can update bio assets','Authenticated users can update category images','Authenticated users can update community assets','Authenticated users can update ebook assets','Authenticated users can update event covers','Authenticated users can update hr avatars','Authenticated users can update product images','Authenticated users can update store assets','Authenticated users can upload avatars','Authenticated users can upload bio assets','Authenticated users can upload category images','Authenticated users can upload community assets','Authenticated users can upload company logos','Authenticated users can upload documents','Authenticated users can upload ebook assets','Authenticated users can upload email assets','Authenticated users can upload email attachments','Authenticated users can upload email images','Authenticated users can upload entity documents','Authenticated users can upload event covers','Authenticated users can upload hr avatars','Authenticated users can upload product documents','Authenticated users can upload product images','Authenticated users can upload proposal PDFs','Authenticated users can upload rfq pdfs','Authenticated users can upload store assets','Authenticated users can upload ticket attachments','Users can delete email images','Users can delete own email attachments','Users can delete their workspace logos','Users can update email images','Users can update their workspace logos','Workspace members can delete deliverables','Workspace members can upload deliverables','c2c photos authenticated upload','c2c videos upload','hr_cvs_insert','leadchef_products_authed_delete','leadchef_products_authed_update','leadchef_products_authed_write','store_cat_images_auth_delete','store_cat_images_auth_insert','store_cat_images_auth_update','workspace members delete rfq quote files','workspace members upload rfq quote files')
  LOOP
    IF r.cmd='INSERT' THEN
      EXECUTE format('ALTER POLICY %I ON storage.objects WITH CHECK ((%s) AND owner_id = (select auth.uid()::text))', r.policyname, r.with_check);
    ELSE
      EXECUTE format('ALTER POLICY %I ON storage.objects USING ((%s) AND owner_id = (select auth.uid()::text))', r.policyname, r.qual);
      IF r.with_check IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON storage.objects WITH CHECK ((%s) AND owner_id = (select auth.uid()::text))', r.policyname, r.with_check);
      END IF;
    END IF;
  END LOOP;
END $$;

ALTER POLICY presence_select_authed ON public.user_presence USING (
  user_id = auth.uid() OR public.is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = user_presence.user_id AND wm.workspace_id IN (SELECT public.get_user_workspace_ids())));

ALTER POLICY "Anyone can read community events" ON public.community_events USING (
  workspace_id IN (SELECT public.get_user_workspace_ids()) OR public.is_super_admin(auth.uid()));

ALTER POLICY "Authenticated users can create workspaces" ON public.workspaces WITH CHECK (owner_id = auth.uid());

ALTER POLICY "authenticated users can create bug reports" ON public.bug_reports WITH CHECK (user_id = auth.uid());