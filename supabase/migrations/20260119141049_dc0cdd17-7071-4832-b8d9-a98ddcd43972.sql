-- Create reusable function to check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  );
$$;

-- Fix check_invoice_settings_access to use user_roles table (not super_admins which doesn't exist)
CREATE OR REPLACE FUNCTION public.check_invoice_settings_access(check_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Allow access if user is super_admin (from user_roles table)
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = current_user_id 
    AND role = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Otherwise check workspace membership
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = check_workspace_id
    AND user_id = current_user_id
  );
END;
$$;