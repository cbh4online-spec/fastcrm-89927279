-- Fix is_super_admin() function without parameters to use profiles mapping
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.profiles p ON p.id = ur.user_id
    WHERE p.user_id = auth.uid()
    AND ur.role = 'super_admin'
  );
$function$;

-- Fix is_super_admin(uuid) function - keep same parameter name _user_id
-- This expects the auth.uid() to be passed, not profiles.id
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.profiles p ON p.id = ur.user_id
    WHERE p.user_id = _user_id
    AND ur.role = 'super_admin'
  )
$function$;

-- Update RLS policy for user_roles to use correct mapping
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT id FROM public.profiles WHERE profiles.user_id = auth.uid())
);