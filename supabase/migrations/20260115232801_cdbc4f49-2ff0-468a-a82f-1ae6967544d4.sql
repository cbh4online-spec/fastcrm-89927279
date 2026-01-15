-- Drop existing INSERT policy for custom_fields
DROP POLICY IF EXISTS "Admins can create custom fields" ON public.custom_fields;

-- Create a new INSERT policy that allows all workspace members to create custom fields
CREATE POLICY "Workspace members can create custom fields" 
ON public.custom_fields 
FOR INSERT 
WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Also update the UPDATE and DELETE policies to allow all members (optional, depending on requirements)
-- For now, keeping them as admin/owner only for safety