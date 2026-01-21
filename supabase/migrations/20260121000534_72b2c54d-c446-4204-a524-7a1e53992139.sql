-- Drop the existing ALL policy and create separate policies for proper INSERT handling
DROP POLICY IF EXISTS "Workspace members can manage SEO entities" ON public.seo_entities;

-- SELECT: Members can view their workspace's SEO entities
CREATE POLICY "Workspace members can view SEO entities" 
ON public.seo_entities 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- INSERT: Members can create SEO entities in their workspace
CREATE POLICY "Workspace members can create SEO entities" 
ON public.seo_entities 
FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- UPDATE: Members can update their workspace's SEO entities
CREATE POLICY "Workspace members can update SEO entities" 
ON public.seo_entities 
FOR UPDATE 
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- DELETE: Members can delete their workspace's SEO entities
CREATE POLICY "Workspace members can delete SEO entities" 
ON public.seo_entities 
FOR DELETE 
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);