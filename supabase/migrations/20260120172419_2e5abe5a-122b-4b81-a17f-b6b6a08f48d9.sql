-- Add RLS policy for super_admins to access all professional prospecting profiles
CREATE POLICY "Super admins can view all prospecting profiles"
ON public.professional_prospecting_profiles
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for super_admins to manage all prospecting profiles
CREATE POLICY "Super admins can manage all prospecting profiles"
ON public.professional_prospecting_profiles
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));