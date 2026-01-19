-- First drop the policies, then the function
DROP POLICY IF EXISTS "Users can view invoice settings in their workspace" ON public.invoice_settings;
DROP POLICY IF EXISTS "Users can insert invoice settings in their workspace" ON public.invoice_settings;
DROP POLICY IF EXISTS "Users can update invoice settings in their workspace" ON public.invoice_settings;

-- Now drop the function
DROP FUNCTION IF EXISTS public.is_workspace_member(UUID);

-- Create with a different name to avoid conflict with existing is_workspace_member(uuid, uuid)
CREATE OR REPLACE FUNCTION public.check_invoice_settings_access(check_workspace_id UUID)
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

-- Recreate policies using the new function
CREATE POLICY "Users can view invoice settings in their workspace"
ON public.invoice_settings
FOR SELECT
USING (public.check_invoice_settings_access(workspace_id));

CREATE POLICY "Users can insert invoice settings in their workspace"
ON public.invoice_settings
FOR INSERT
WITH CHECK (public.check_invoice_settings_access(workspace_id));

CREATE POLICY "Users can update invoice settings in their workspace"
ON public.invoice_settings
FOR UPDATE
USING (public.check_invoice_settings_access(workspace_id))
WITH CHECK (public.check_invoice_settings_access(workspace_id));