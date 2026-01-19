-- Create a security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(check_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = check_workspace_id
    AND user_id = auth.uid()
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view invoice settings in their workspace" ON public.invoice_settings;
DROP POLICY IF EXISTS "Users can insert invoice settings in their workspace" ON public.invoice_settings;
DROP POLICY IF EXISTS "Users can update invoice settings in their workspace" ON public.invoice_settings;

-- Recreate policies using the function
CREATE POLICY "Users can view invoice settings in their workspace"
ON public.invoice_settings
FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Users can insert invoice settings in their workspace"
ON public.invoice_settings
FOR INSERT
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Users can update invoice settings in their workspace"
ON public.invoice_settings
FOR UPDATE
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));