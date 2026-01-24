
-- Drop existing INSERT policy
DROP POLICY IF EXISTS sj_courses_insert ON public.sj_courses;

-- Create a simpler INSERT policy that checks workspace membership directly
CREATE POLICY sj_courses_insert ON public.sj_courses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = sj_courses.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin', 'agent')
  )
  AND
  EXISTS (
    SELECT 1 FROM public.workspace_modules wmod
    JOIN public.marketplace_modules mm ON mm.id = wmod.module_id
    WHERE wmod.workspace_id = sj_courses.workspace_id
    AND mm.slug = 'student-journey'
    AND wmod.status IN ('active', 'trial')
  )
);
