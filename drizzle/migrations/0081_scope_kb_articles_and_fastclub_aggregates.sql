DROP POLICY IF EXISTS "authenticated users can read all articles" ON public.kb_articles;
CREATE POLICY "authenticated read published articles" ON public.kb_articles FOR SELECT TO authenticated USING (is_published = true OR public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Authenticated can read aggregates" ON public.fastclub_crm_aggregates;
CREATE POLICY "Members read own workspace aggregates" ON public.fastclub_crm_aggregates FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));