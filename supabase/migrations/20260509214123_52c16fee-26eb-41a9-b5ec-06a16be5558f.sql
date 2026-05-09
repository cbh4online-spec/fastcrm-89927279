-- 1. Audit logs: enforce user_id = auth.uid() on INSERT
DROP POLICY IF EXISTS leadchef_audit_insert_members ON public.leadchef_audit_logs;
CREATE POLICY leadchef_audit_insert_self_member
ON public.leadchef_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_workspace_member(auth.uid(), workspace_id)
);

-- 2. Audit logs: explicit deny UPDATE/DELETE for defense in depth
DROP POLICY IF EXISTS leadchef_audit_no_update ON public.leadchef_audit_logs;
CREATE POLICY leadchef_audit_no_update
ON public.leadchef_audit_logs
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS leadchef_audit_no_delete ON public.leadchef_audit_logs;
CREATE POLICY leadchef_audit_no_delete
ON public.leadchef_audit_logs
FOR DELETE
TO authenticated
USING (false);

-- 3. Restrict DELETE on operational data to admin/owner only
DROP POLICY IF EXISTS leadchef_profiles_ws_delete ON public.leadchef_lead_profiles;
CREATE POLICY leadchef_profiles_ws_delete
ON public.leadchef_lead_profiles
FOR DELETE
TO authenticated
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

DROP POLICY IF EXISTS leadchef_client_profiles_ws_delete ON public.leadchef_client_profiles;
CREATE POLICY leadchef_client_profiles_ws_delete
ON public.leadchef_client_profiles
FOR DELETE
TO authenticated
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

DROP POLICY IF EXISTS leadchef_referrals_ws_delete ON public.leadchef_referrals;
CREATE POLICY leadchef_referrals_ws_delete
ON public.leadchef_referrals
FOR DELETE
TO authenticated
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

DROP POLICY IF EXISTS leadchef_cx_ws_delete ON public.leadchef_customer_experiences;
CREATE POLICY leadchef_cx_ws_delete
ON public.leadchef_customer_experiences
FOR DELETE
TO authenticated
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));