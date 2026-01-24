
-- Fix search_path for has_sj_module_access function
CREATE OR REPLACE FUNCTION public.has_sj_module_access(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.workspace_modules wmod ON wmod.workspace_id = wm.workspace_id
    JOIN public.marketplace_modules mm ON mm.id = wmod.module_id
    WHERE wm.workspace_id = p_workspace_id 
    AND wm.user_id = p_user_id
    AND mm.slug = 'student-journey'
    AND wmod.status IN ('active', 'trial')
  );
END;
$$;

-- Fix search_path for get_sj_permission function
CREATE OR REPLACE FUNCTION public.get_sj_permission(p_workspace_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_workspace_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.sj_permissions
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;
  
  SELECT role INTO v_workspace_role FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  IF v_workspace_role IN ('owner', 'admin') THEN
    RETURN 'admin';
  ELSIF v_workspace_role = 'agent' THEN
    RETURN 'agent';
  ELSE
    RETURN 'viewer';
  END IF;
END;
$$;
