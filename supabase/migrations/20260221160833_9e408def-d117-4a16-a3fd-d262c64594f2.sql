
DROP POLICY IF EXISTS "Workspace members can manage bio_blocks" ON public.bio_blocks;

CREATE POLICY "Workspace members or super admins can manage bio_blocks"
ON public.bio_blocks FOR ALL
USING (
  is_super_admin(auth.uid())
  OR workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);
