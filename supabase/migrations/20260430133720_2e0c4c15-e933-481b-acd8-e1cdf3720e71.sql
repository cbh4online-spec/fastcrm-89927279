CREATE OR REPLACE FUNCTION public.can_manage_workspace(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.user_id = _user_id
        AND wm.workspace_id = _workspace_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.workspaces target_ws
      JOIN public.workspace_members agency_member
        ON agency_member.workspace_id = target_ws.managed_by_workspace_id
      WHERE target_ws.id = _workspace_id
        AND agency_member.user_id = _user_id
        AND agency_member.role IN ('owner', 'admin', 'agency')
    );
$$;

DROP POLICY IF EXISTS "Workspace members can manage sequences" ON public.email_sequences;

CREATE POLICY "Workspace members and agency admins can manage sequences"
ON public.email_sequences
FOR ALL
TO authenticated
USING (public.can_manage_workspace(auth.uid(), workspace_id))
WITH CHECK (public.can_manage_workspace(auth.uid(), workspace_id));