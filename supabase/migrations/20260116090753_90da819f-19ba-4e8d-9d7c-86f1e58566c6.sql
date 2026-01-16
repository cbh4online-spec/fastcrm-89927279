-- Update is_workspace_member to include super_admin check
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    public.is_super_admin(_user_id) 
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE user_id = _user_id
        AND workspace_id = _workspace_id
    )
$$;

-- Update is_workspace_admin_or_owner to include super_admin check
CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_owner(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE user_id = _user_id
        AND workspace_id = _workspace_id
        AND role IN ('owner', 'admin')
    )
$$;