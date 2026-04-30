DROP POLICY IF EXISTS "Workspace members can manage sequences" ON public.email_sequences;

CREATE POLICY "Workspace members can manage sequences"
ON public.email_sequences
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);