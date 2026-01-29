-- Fix RLS policies for vibe_profiles to allow INSERT with proper WITH CHECK clause

-- Drop the existing ALL policy that doesn't work properly for INSERT
DROP POLICY IF EXISTS "Users can manage vibe profiles in their workspace" ON public.vibe_profiles;

-- Create separate policies for each operation with proper clauses

-- SELECT policy (already exists but recreate for consistency)
DROP POLICY IF EXISTS "Users can view vibe profiles in their workspace" ON public.vibe_profiles;

CREATE POLICY "Users can view vibe profiles in their workspace"
ON public.vibe_profiles
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

-- INSERT policy with WITH CHECK
CREATE POLICY "Users can insert vibe profiles in their workspace"
ON public.vibe_profiles
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
  OR public.is_super_admin(auth.uid())
);

-- UPDATE policy
CREATE POLICY "Users can update vibe profiles in their workspace"
ON public.vibe_profiles
FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
  OR public.is_super_admin(auth.uid())
);

-- DELETE policy
CREATE POLICY "Users can delete vibe profiles in their workspace"
ON public.vibe_profiles
FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
  OR public.is_super_admin(auth.uid())
);