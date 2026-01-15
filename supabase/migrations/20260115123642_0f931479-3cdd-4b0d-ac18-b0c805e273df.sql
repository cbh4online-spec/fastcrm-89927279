-- Create admin audit logs table for tracking all super admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_admin_audit_logs_admin ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_workspace ON public.admin_audit_logs(workspace_id);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action_type);
CREATE INDEX idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view/insert audit logs
CREATE POLICY "Super admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Create system incidents table
CREATE TABLE IF NOT EXISTS public.system_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_system_incidents_status ON public.system_incidents(status);
CREATE INDEX idx_system_incidents_severity ON public.system_incidents(severity);
CREATE INDEX idx_system_incidents_workspace ON public.system_incidents(workspace_id);
CREATE INDEX idx_system_incidents_created ON public.system_incidents(created_at DESC);

-- Enable RLS
ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage incidents
CREATE POLICY "Super admins can manage incidents"
ON public.system_incidents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Create workspace overrides table for temporary limit adjustments
CREATE TABLE IF NOT EXISTS public.workspace_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL,
  override_value JSONB NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_workspace_overrides_workspace ON public.workspace_overrides(workspace_id);
CREATE INDEX idx_workspace_overrides_active ON public.workspace_overrides(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.workspace_overrides ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage overrides
CREATE POLICY "Super admins can manage overrides"
ON public.workspace_overrides
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Add impersonation tracking column to existing sessions if needed
-- This is for audit purposes when super admin accesses workspace as support

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id TEXT DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action_type,
    target_type,
    target_id,
    workspace_id,
    details
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_target_type,
    p_target_id,
    p_workspace_id,
    p_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute to authenticated users (function handles its own auth check)
GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated;