
-- Fix SELECT policy: use is_super_admin() instead of has_role()
DROP POLICY IF EXISTS "Super admins can view audit logs" ON public.admin_audit_logs;

CREATE POLICY "Super admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- Fix INSERT policy for consistency
DROP POLICY IF EXISTS "Super admins can insert audit logs" ON public.admin_audit_logs;

CREATE POLICY "Super admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());
