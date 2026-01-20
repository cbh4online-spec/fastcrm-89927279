-- Create menu_permissions table for role-based menu access
CREATE TABLE IF NOT EXISTS public.menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.workspace_role NOT NULL,
  menu_key TEXT NOT NULL,
  can_access BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, menu_key)
);

-- Enable RLS
ALTER TABLE public.menu_permissions ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage menu permissions
CREATE POLICY "Super admins can manage menu permissions"
  ON public.menu_permissions
  FOR ALL
  USING (public.is_super_admin());

-- Everyone can read menu permissions
CREATE POLICY "Authenticated users can read menu permissions"
  ON public.menu_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert default permissions for each role
-- Owner: full access to everything
INSERT INTO public.menu_permissions (role, menu_key, can_access, can_edit) VALUES
  ('owner', 'dashboard', true, true),
  ('owner', 'feed', true, true),
  ('owner', 'productivity', true, true),
  ('owner', 'inbox', true, true),
  ('owner', 'crm', true, true),
  ('owner', 'leads', true, true),
  ('owner', 'contacts', true, true),
  ('owner', 'companies', true, true),
  ('owner', 'pipeline', true, true),
  ('owner', 'proposals', true, true),
  ('owner', 'invoices', true, true),
  ('owner', 'products', true, true),
  ('owner', 'marketing', true, true),
  ('owner', 'automations', true, true),
  ('owner', 'reports', true, true),
  ('owner', 'calendar', true, true),
  ('owner', 'settings', true, true),
  ('owner', 'team', true, true),
  ('owner', 'integrations', true, true);

-- Admin: almost full access
INSERT INTO public.menu_permissions (role, menu_key, can_access, can_edit) VALUES
  ('admin', 'dashboard', true, true),
  ('admin', 'feed', true, true),
  ('admin', 'productivity', true, true),
  ('admin', 'inbox', true, true),
  ('admin', 'crm', true, true),
  ('admin', 'leads', true, true),
  ('admin', 'contacts', true, true),
  ('admin', 'companies', true, true),
  ('admin', 'pipeline', true, true),
  ('admin', 'proposals', true, true),
  ('admin', 'invoices', true, true),
  ('admin', 'products', true, true),
  ('admin', 'marketing', true, true),
  ('admin', 'automations', true, true),
  ('admin', 'reports', true, true),
  ('admin', 'calendar', true, true),
  ('admin', 'settings', true, true),
  ('admin', 'team', true, false),
  ('admin', 'integrations', true, true);

-- Agent: operational access
INSERT INTO public.menu_permissions (role, menu_key, can_access, can_edit) VALUES
  ('agent', 'dashboard', true, false),
  ('agent', 'feed', true, true),
  ('agent', 'productivity', true, true),
  ('agent', 'inbox', true, true),
  ('agent', 'crm', true, true),
  ('agent', 'leads', true, true),
  ('agent', 'contacts', true, true),
  ('agent', 'companies', true, true),
  ('agent', 'pipeline', true, true),
  ('agent', 'proposals', true, true),
  ('agent', 'invoices', false, false),
  ('agent', 'products', true, false),
  ('agent', 'marketing', false, false),
  ('agent', 'automations', false, false),
  ('agent', 'reports', true, false),
  ('agent', 'calendar', true, true),
  ('agent', 'settings', false, false),
  ('agent', 'team', false, false),
  ('agent', 'integrations', false, false);

-- Viewer: read-only access
INSERT INTO public.menu_permissions (role, menu_key, can_access, can_edit) VALUES
  ('viewer', 'dashboard', true, false),
  ('viewer', 'feed', true, false),
  ('viewer', 'productivity', false, false),
  ('viewer', 'inbox', false, false),
  ('viewer', 'crm', true, false),
  ('viewer', 'leads', true, false),
  ('viewer', 'contacts', true, false),
  ('viewer', 'companies', true, false),
  ('viewer', 'pipeline', true, false),
  ('viewer', 'proposals', true, false),
  ('viewer', 'invoices', false, false),
  ('viewer', 'products', true, false),
  ('viewer', 'marketing', false, false),
  ('viewer', 'automations', false, false),
  ('viewer', 'reports', true, false),
  ('viewer', 'calendar', true, false),
  ('viewer', 'settings', false, false),
  ('viewer', 'team', false, false),
  ('viewer', 'integrations', false, false);

-- Agency: client management access
INSERT INTO public.menu_permissions (role, menu_key, can_access, can_edit) VALUES
  ('agency', 'dashboard', true, true),
  ('agency', 'feed', true, true),
  ('agency', 'productivity', true, true),
  ('agency', 'inbox', true, true),
  ('agency', 'crm', true, true),
  ('agency', 'leads', true, true),
  ('agency', 'contacts', true, true),
  ('agency', 'companies', true, true),
  ('agency', 'pipeline', true, true),
  ('agency', 'proposals', true, true),
  ('agency', 'invoices', true, true),
  ('agency', 'products', true, true),
  ('agency', 'marketing', true, true),
  ('agency', 'automations', true, true),
  ('agency', 'reports', true, true),
  ('agency', 'calendar', true, true),
  ('agency', 'settings', true, false),
  ('agency', 'team', false, false),
  ('agency', 'integrations', true, true);

-- Function to create workspace with specific owner (for super admin)
CREATE OR REPLACE FUNCTION public.create_workspace_for_user(
  p_name TEXT,
  p_slug TEXT,
  p_owner_user_id UUID,
  p_plan TEXT DEFAULT 'free'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_workspace_id UUID;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  
  -- Only super admins can use this function
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can create workspaces for other users';
  END IF;
  
  -- Verify the target user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_owner_user_id) THEN
    RAISE EXCEPTION 'User with ID % does not exist', p_owner_user_id;
  END IF;
  
  -- Check if slug is unique
  IF EXISTS (SELECT 1 FROM public.workspaces WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'Workspace with slug % already exists', p_slug;
  END IF;
  
  -- Create the workspace
  INSERT INTO public.workspaces (name, slug, created_by)
  VALUES (p_name, p_slug, v_caller_id)
  RETURNING id INTO v_workspace_id;
  
  -- Add the specified user as owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, p_owner_user_id, 'owner');
  
  -- Create subscription with the specified plan
  INSERT INTO public.workspace_subscriptions (workspace_id, plan, status)
  VALUES (v_workspace_id, p_plan::public.subscription_plan, 'active');
  
  -- Log the action
  PERFORM public.log_admin_action(
    'workspace_created',
    'workspace',
    v_workspace_id::TEXT,
    v_workspace_id,
    jsonb_build_object(
      'name', p_name,
      'slug', p_slug,
      'owner_user_id', p_owner_user_id,
      'plan', p_plan
    )
  );
  
  RETURN json_build_object(
    'id', v_workspace_id,
    'name', p_name,
    'slug', p_slug,
    'owner_user_id', p_owner_user_id,
    'plan', p_plan,
    'created_at', NOW()
  );
END;
$$;

-- Function to add member to workspace (for super admin)
CREATE OR REPLACE FUNCTION public.add_workspace_member_admin(
  p_workspace_id UUID,
  p_user_id UUID,
  p_role public.workspace_role DEFAULT 'viewer'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only super admins can use this function
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can add workspace members';
  END IF;
  
  -- Verify workspace exists
  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = p_workspace_id) THEN
    RAISE EXCEPTION 'Workspace does not exist';
  END IF;
  
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  
  -- Check if already a member
  IF EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = p_workspace_id AND user_id = p_user_id) THEN
    -- Update role instead
    UPDATE public.workspace_members
    SET role = p_role
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
    
    RETURN json_build_object('action', 'updated', 'role', p_role);
  END IF;
  
  -- Add member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, p_user_id, p_role);
  
  -- Log action
  PERFORM public.log_admin_action(
    'member_added',
    'workspace_member',
    p_user_id::TEXT,
    p_workspace_id,
    jsonb_build_object('role', p_role)
  );
  
  RETURN json_build_object('action', 'added', 'role', p_role);
END;
$$;

-- Function to remove member from workspace (for super admin)
CREATE OR REPLACE FUNCTION public.remove_workspace_member_admin(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_count INTEGER;
BEGIN
  -- Only super admins can use this function
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can remove workspace members';
  END IF;
  
  -- Check if this would remove the last owner
  SELECT COUNT(*) INTO v_owner_count
  FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND role = 'owner';
  
  IF v_owner_count <= 1 AND EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Cannot remove the last owner from workspace';
  END IF;
  
  -- Remove member
  DELETE FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  -- Log action
  PERFORM public.log_admin_action(
    'member_removed',
    'workspace_member',
    p_user_id::TEXT,
    p_workspace_id,
    '{}'::jsonb
  );
  
  RETURN json_build_object('success', true);
END;
$$;

-- Function to update member role (for super admin)
CREATE OR REPLACE FUNCTION public.update_workspace_member_role_admin(
  p_workspace_id UUID,
  p_user_id UUID,
  p_new_role public.workspace_role
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_role public.workspace_role;
  v_owner_count INTEGER;
BEGIN
  -- Only super admins can use this function
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can update workspace member roles';
  END IF;
  
  -- Get current role
  SELECT role INTO v_old_role
  FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  IF v_old_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this workspace';
  END IF;
  
  -- Check if this would remove the last owner
  IF v_old_role = 'owner' AND p_new_role != 'owner' THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND role = 'owner';
    
    IF v_owner_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last owner';
    END IF;
  END IF;
  
  -- Update role
  UPDATE public.workspace_members
  SET role = p_new_role
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  -- Log action
  PERFORM public.log_admin_action(
    'member_role_updated',
    'workspace_member',
    p_user_id::TEXT,
    p_workspace_id,
    jsonb_build_object('old_role', v_old_role, 'new_role', p_new_role)
  );
  
  RETURN json_build_object('success', true, 'old_role', v_old_role, 'new_role', p_new_role);
END;
$$;