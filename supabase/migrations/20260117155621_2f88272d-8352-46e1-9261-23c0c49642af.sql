-- Fix workspace_modules RLS policies to include super_admin support
-- Note: workspace_members.role is of type workspace_role enum

-- DROP existing policies (if they still exist after partial migration)
DROP POLICY IF EXISTS "Admins can manage workspace modules" ON public.workspace_modules;
DROP POLICY IF EXISTS "Users can view workspace modules" ON public.workspace_modules;
DROP POLICY IF EXISTS "Admins can insert workspace modules" ON public.workspace_modules;
DROP POLICY IF EXISTS "Admins can update workspace modules" ON public.workspace_modules;
DROP POLICY IF EXISTS "Admins can delete workspace modules" ON public.workspace_modules;

-- CREATE new policies with super_admin support

-- SELECT policy: super admins or workspace members can view
CREATE POLICY "Users can view workspace modules"
ON public.workspace_modules FOR SELECT
USING (
  public.is_super_admin(auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_modules.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- INSERT policy: super admins or workspace owners/admins can insert
CREATE POLICY "Admins can insert workspace modules"
ON public.workspace_modules FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_modules.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner'::workspace_role, 'admin'::workspace_role)
  )
);

-- UPDATE policy: super admins or workspace owners/admins can update
CREATE POLICY "Admins can update workspace modules"
ON public.workspace_modules FOR UPDATE
USING (
  public.is_super_admin(auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_modules.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner'::workspace_role, 'admin'::workspace_role)
  )
);

-- DELETE policy: super admins or workspace owners/admins can delete
CREATE POLICY "Admins can delete workspace modules"
ON public.workspace_modules FOR DELETE
USING (
  public.is_super_admin(auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_modules.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner'::workspace_role, 'admin'::workspace_role)
  )
);