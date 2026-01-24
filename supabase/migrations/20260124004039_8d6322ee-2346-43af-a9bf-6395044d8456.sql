
-- Drop and recreate all sj_courses policies to include super admin access
DROP POLICY IF EXISTS sj_courses_select ON public.sj_courses;
DROP POLICY IF EXISTS sj_courses_insert ON public.sj_courses;
DROP POLICY IF EXISTS sj_courses_update ON public.sj_courses;
DROP POLICY IF EXISTS sj_courses_delete ON public.sj_courses;

-- SELECT: workspace members with module OR super admin
CREATE POLICY sj_courses_select ON public.sj_courses
FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR
  (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = sj_courses.workspace_id
      AND wm.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.workspace_modules wmod
      JOIN public.marketplace_modules mm ON mm.id = wmod.module_id
      WHERE wmod.workspace_id = sj_courses.workspace_id
      AND mm.slug = 'student-journey'
      AND wmod.status IN ('active', 'trial')
    )
  )
);

-- INSERT: workspace admins/agents with module OR super admin
CREATE POLICY sj_courses_insert ON public.sj_courses
FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid())
  OR
  (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = sj_courses.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'agent')
    )
    AND EXISTS (
      SELECT 1 FROM public.workspace_modules wmod
      JOIN public.marketplace_modules mm ON mm.id = wmod.module_id
      WHERE wmod.workspace_id = sj_courses.workspace_id
      AND mm.slug = 'student-journey'
      AND wmod.status IN ('active', 'trial')
    )
  )
);

-- UPDATE: workspace admins/agents with module OR super admin
CREATE POLICY sj_courses_update ON public.sj_courses
FOR UPDATE USING (
  public.is_super_admin(auth.uid())
  OR
  (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = sj_courses.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'agent')
    )
    AND EXISTS (
      SELECT 1 FROM public.workspace_modules wmod
      JOIN public.marketplace_modules mm ON mm.id = wmod.module_id
      WHERE wmod.workspace_id = sj_courses.workspace_id
      AND mm.slug = 'student-journey'
      AND wmod.status IN ('active', 'trial')
    )
  )
);

-- DELETE: only workspace admins with module OR super admin
CREATE POLICY sj_courses_delete ON public.sj_courses
FOR DELETE USING (
  public.is_super_admin(auth.uid())
  OR
  (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = sj_courses.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM public.workspace_modules wmod
      JOIN public.marketplace_modules mm ON mm.id = wmod.module_id
      WHERE wmod.workspace_id = sj_courses.workspace_id
      AND mm.slug = 'student-journey'
      AND wmod.status IN ('active', 'trial')
    )
  )
);
