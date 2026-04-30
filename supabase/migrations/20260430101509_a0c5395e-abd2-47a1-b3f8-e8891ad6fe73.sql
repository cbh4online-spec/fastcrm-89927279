-- Substitui INSERT policy para aceitar membros, owners do workspace e super_admin
DROP POLICY IF EXISTS "Users can create notes in their workspace" ON public.entity_notes;

CREATE POLICY "Users can create notes in their workspace"
ON public.entity_notes
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

-- Alinhar SELECT/UPDATE/DELETE para o mesmo modelo
DROP POLICY IF EXISTS "Users can view notes in their workspace" ON public.entity_notes;
CREATE POLICY "Users can view notes in their workspace"
ON public.entity_notes
FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update notes in their workspace" ON public.entity_notes;
CREATE POLICY "Users can update notes in their workspace"
ON public.entity_notes
FOR UPDATE
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete notes in their workspace" ON public.entity_notes;
CREATE POLICY "Users can delete notes in their workspace"
ON public.entity_notes
FOR DELETE
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);