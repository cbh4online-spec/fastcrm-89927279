-- Drop the restrictive policy that prevents new workspace creators from adding themselves
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.workspace_members;

-- Create a policy that allows users to add themselves as owner to a new workspace
CREATE POLICY "Users can add themselves as owner to new workspaces"
ON public.workspace_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'owner' 
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id
  )
);

-- Create a policy that allows owners and admins to add other members
CREATE POLICY "Owners and admins can add members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  public.is_workspace_admin_or_owner(auth.uid(), workspace_id)
);