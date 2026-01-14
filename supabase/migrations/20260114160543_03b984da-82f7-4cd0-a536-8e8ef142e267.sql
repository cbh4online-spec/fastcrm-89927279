-- Drop the overly permissive policy and create a more secure one
DROP POLICY IF EXISTS "System can manage usage" ON public.workspace_usage;

-- Create more restrictive policy - workspace admins can insert/update usage
CREATE POLICY "Workspace admins can manage usage"
ON public.workspace_usage
FOR ALL
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));