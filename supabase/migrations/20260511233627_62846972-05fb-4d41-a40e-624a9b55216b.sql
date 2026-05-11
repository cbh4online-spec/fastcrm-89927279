
-- Fix inverted is_workspace_member argument order in builder RLS policies

DROP POLICY IF EXISTS sites_select_member ON public.builder_sites;
DROP POLICY IF EXISTS sites_insert_member ON public.builder_sites;
DROP POLICY IF EXISTS sites_update_member ON public.builder_sites;
DROP POLICY IF EXISTS sites_delete_member ON public.builder_sites;

CREATE POLICY sites_select_member ON public.builder_sites
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY sites_insert_member ON public.builder_sites
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY sites_update_member ON public.builder_sites
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY sites_delete_member ON public.builder_sites
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS pages_all_member ON public.builder_site_pages;
CREATE POLICY pages_all_member ON public.builder_site_pages
  FOR ALL USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS site_assets_all_member ON public.builder_site_assets;
CREATE POLICY site_assets_all_member ON public.builder_site_assets
  FOR ALL USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
