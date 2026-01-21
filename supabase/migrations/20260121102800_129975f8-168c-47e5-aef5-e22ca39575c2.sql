-- Remover políticas existentes e recriar com isolamento correto

-- seo_entities
DROP POLICY IF EXISTS "Workspace members can update SEO entities" ON seo_entities;
DROP POLICY IF EXISTS "Workspace members can delete SEO entities" ON seo_entities;
DROP POLICY IF EXISTS "Workspace members can insert SEO entities" ON seo_entities;
DROP POLICY IF EXISTS "Workspace members can view own SEO entities" ON seo_entities;

CREATE POLICY "Workspace members can view own SEO entities"
  ON seo_entities
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can insert SEO entities"
  ON seo_entities
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can update SEO entities"
  ON seo_entities
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can delete SEO entities"
  ON seo_entities
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

-- seo_comparisons  
DROP POLICY IF EXISTS "Workspace members can view own SEO comparisons" ON seo_comparisons;

CREATE POLICY "Workspace members can view own SEO comparisons"
  ON seo_comparisons
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

-- seo_faqs
DROP POLICY IF EXISTS "Workspace members can view own SEO FAQs" ON seo_faqs;

CREATE POLICY "Workspace members can view own SEO FAQs"
  ON seo_faqs
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );