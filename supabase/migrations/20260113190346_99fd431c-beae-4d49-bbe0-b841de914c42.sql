-- Create enum for workspace status
CREATE TYPE public.workspace_status AS ENUM ('active', 'suspended', 'inactive', 'pending');

-- Create admin_settings table for Control Plane configuration
CREATE TABLE public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create workspace_instances table for multi-tenant Supabase routing
CREATE TABLE public.workspace_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    supabase_url TEXT NOT NULL,
    supabase_anon_key TEXT NOT NULL,
    status workspace_status NOT NULL DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_instances ENABLE ROW LEVEL SECURITY;

-- Create app_role enum for admin roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'super_admin')
$$;

-- RLS Policies for admin_settings (only super_admin can access)
CREATE POLICY "Super admins can view admin settings"
ON public.admin_settings FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert admin settings"
ON public.admin_settings FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update admin settings"
ON public.admin_settings FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete admin settings"
ON public.admin_settings FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS Policies for workspace_instances (only super_admin can manage)
CREATE POLICY "Super admins can view workspace instances"
ON public.workspace_instances FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert workspace instances"
ON public.workspace_instances FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update workspace instances"
ON public.workspace_instances FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete workspace instances"
ON public.workspace_instances FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_instances_updated_at
BEFORE UPDATE ON public.workspace_instances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();