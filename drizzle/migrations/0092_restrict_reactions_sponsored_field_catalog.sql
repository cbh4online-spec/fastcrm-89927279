DROP POLICY IF EXISTS "Users can view reactions" ON public.post_reactions;
CREATE POLICY "Members can view reactions" ON public.post_reactions FOR SELECT TO authenticated
USING (
  (SELECT public.is_super_admin(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.internal_posts p
    LEFT JOIN public.post_comments c ON c.id = post_reactions.comment_id
    WHERE p.id = COALESCE(post_reactions.post_id, c.post_id)
      AND p.workspace_id IN (SELECT public.get_user_workspace_ids())
  )
);

DROP POLICY IF EXISTS "c2c_sponsored_public_read" ON public.c2c_sponsored_listings;
CREATE POLICY "c2c_sponsored_public_read_active" ON public.c2c_sponsored_listings FOR SELECT TO anon, authenticated
USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "c2c_sponsored_members_read" ON public.c2c_sponsored_listings FOR SELECT TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

DROP POLICY IF EXISTS "Anyone authenticated can read field catalog" ON public.field_catalog;
CREATE POLICY "Workspace members can read field catalog" ON public.field_catalog FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));