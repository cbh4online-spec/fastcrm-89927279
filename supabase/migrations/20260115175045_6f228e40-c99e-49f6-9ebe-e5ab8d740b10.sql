-- Allow super admins to update any workspace (including managed_by_workspace_id)
CREATE POLICY "Super admins can update all workspaces" 
ON public.workspaces
FOR UPDATE
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));