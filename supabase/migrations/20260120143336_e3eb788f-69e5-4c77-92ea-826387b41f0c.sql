-- Create object_permissions table for granular object-level access control
CREATE TABLE public.object_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, object_key, role, permission_key)
);

-- Create field_permissions table for field-level access control
CREATE TABLE public.field_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  role TEXT NOT NULL,
  field_key TEXT NOT NULL,
  permission_level TEXT NOT NULL DEFAULT 'edit' CHECK (permission_level IN ('hidden', 'view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, object_key, role, field_key)
);

-- Create ip_restrictions table for IP whitelist/blacklist
CREATE TABLE public.ip_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace_settings table for workspace-level settings
CREATE TABLE public.workspace_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  ip_restrictions_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.object_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- Policies for object_permissions
CREATE POLICY "Users can view object permissions for their workspace"
ON public.object_permissions FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage object permissions"
ON public.object_permissions FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR public.is_super_admin(auth.uid())
);

-- Policies for field_permissions
CREATE POLICY "Users can view field permissions for their workspace"
ON public.field_permissions FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage field permissions"
ON public.field_permissions FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR public.is_super_admin(auth.uid())
);

-- Policies for ip_restrictions
CREATE POLICY "Users can view IP restrictions for their workspace"
ON public.ip_restrictions FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage IP restrictions"
ON public.ip_restrictions FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR public.is_super_admin(auth.uid())
);

-- Policies for workspace_settings
CREATE POLICY "Users can view workspace settings"
ON public.workspace_settings FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage workspace settings"
ON public.workspace_settings FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR public.is_super_admin(auth.uid())
);