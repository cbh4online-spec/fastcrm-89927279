-- Substituir política única "ALL" por políticas explícitas por operação,
-- incluindo bypass para super admins (alinhado com restantes módulos).
DROP POLICY IF EXISTS "Users can manage ebooks in their workspace" ON public.ebooks;

CREATE POLICY "ebooks_select_members_or_admin"
ON public.ebooks
FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "ebooks_insert_members_or_admin"
ON public.ebooks
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "ebooks_update_members_or_admin"
ON public.ebooks
FOR UPDATE
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "ebooks_delete_members_or_admin"
ON public.ebooks
FOR DELETE
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  OR public.is_super_admin(auth.uid())
);