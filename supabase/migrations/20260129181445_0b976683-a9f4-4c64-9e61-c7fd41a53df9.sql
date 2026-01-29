-- ==========================================
-- Fix Knowledge Base RLS Policies
-- Add Super Admin access + WITH CHECK clauses
-- ==========================================

-- ==========================================
-- knowledge_bases - Super Admin policies
-- ==========================================

-- Check if policies exist and drop them if needed
DROP POLICY IF EXISTS "Super admins can view all knowledge_bases" ON public.knowledge_bases;
DROP POLICY IF EXISTS "Super admins can insert knowledge_bases" ON public.knowledge_bases;
DROP POLICY IF EXISTS "Super admins can update all knowledge_bases" ON public.knowledge_bases;
DROP POLICY IF EXISTS "Super admins can delete all knowledge_bases" ON public.knowledge_bases;

-- Create Super Admin policies
CREATE POLICY "Super admins can view all knowledge_bases"
  ON public.knowledge_bases FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert knowledge_bases"
  ON public.knowledge_bases FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all knowledge_bases"
  ON public.knowledge_bases FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all knowledge_bases"
  ON public.knowledge_bases FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- Fix existing policy with proper WITH CHECK
DROP POLICY IF EXISTS "Users can manage knowledge bases in their workspace" ON public.knowledge_bases;

CREATE POLICY "Users can manage knowledge bases in their workspace"
  ON public.knowledge_bases FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- ==========================================
-- knowledge_sources - Super Admin policies
-- ==========================================

DROP POLICY IF EXISTS "Super admins can view all knowledge_sources" ON public.knowledge_sources;
DROP POLICY IF EXISTS "Super admins can insert knowledge_sources" ON public.knowledge_sources;
DROP POLICY IF EXISTS "Super admins can update all knowledge_sources" ON public.knowledge_sources;
DROP POLICY IF EXISTS "Super admins can delete all knowledge_sources" ON public.knowledge_sources;

CREATE POLICY "Super admins can view all knowledge_sources"
  ON public.knowledge_sources FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert knowledge_sources"
  ON public.knowledge_sources FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all knowledge_sources"
  ON public.knowledge_sources FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all knowledge_sources"
  ON public.knowledge_sources FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- Fix existing policy
DROP POLICY IF EXISTS "Users can manage knowledge sources in their workspace" ON public.knowledge_sources;

CREATE POLICY "Users can manage knowledge sources in their workspace"
  ON public.knowledge_sources FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- ==========================================
-- knowledge_entries - Super Admin policies
-- ==========================================

DROP POLICY IF EXISTS "Super admins can view all knowledge_entries" ON public.knowledge_entries;
DROP POLICY IF EXISTS "Super admins can insert knowledge_entries" ON public.knowledge_entries;
DROP POLICY IF EXISTS "Super admins can update all knowledge_entries" ON public.knowledge_entries;
DROP POLICY IF EXISTS "Super admins can delete all knowledge_entries" ON public.knowledge_entries;

CREATE POLICY "Super admins can view all knowledge_entries"
  ON public.knowledge_entries FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert knowledge_entries"
  ON public.knowledge_entries FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all knowledge_entries"
  ON public.knowledge_entries FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all knowledge_entries"
  ON public.knowledge_entries FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- Fix existing policy
DROP POLICY IF EXISTS "Users can manage knowledge entries in their workspace" ON public.knowledge_entries;

CREATE POLICY "Users can manage knowledge entries in their workspace"
  ON public.knowledge_entries FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));