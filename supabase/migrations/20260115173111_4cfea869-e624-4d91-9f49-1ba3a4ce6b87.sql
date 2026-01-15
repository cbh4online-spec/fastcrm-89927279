-- Add policy for super admins to view all workspaces
CREATE POLICY "Super admins can view all workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Add policy for super admins to view all companies
CREATE POLICY "Super admins can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Add policy for super admins to view all leads
CREATE POLICY "Super admins can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Add policy for super admins to view all contacts
CREATE POLICY "Super admins can view all contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Add policy for super admins to view all workspace members
CREATE POLICY "Super admins can view all workspace members"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));