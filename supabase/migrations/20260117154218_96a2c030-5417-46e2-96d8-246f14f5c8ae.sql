-- Create security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create categories in their workspace" ON public.product_categories;
DROP POLICY IF EXISTS "Users can view categories in their workspace" ON public.product_categories;
DROP POLICY IF EXISTS "Users can update categories in their workspace" ON public.product_categories;
DROP POLICY IF EXISTS "Users can delete categories in their workspace" ON public.product_categories;

-- Create new policies that include super admin check
CREATE POLICY "Users can view categories in their workspace"
ON public.product_categories
FOR SELECT
USING (
  public.is_super_admin(auth.uid()) 
  OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create categories in their workspace"
ON public.product_categories
FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid()) 
  OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update categories in their workspace"
ON public.product_categories
FOR UPDATE
USING (
  public.is_super_admin(auth.uid()) 
  OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete categories in their workspace"
ON public.product_categories
FOR DELETE
USING (
  public.is_super_admin(auth.uid()) 
  OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);