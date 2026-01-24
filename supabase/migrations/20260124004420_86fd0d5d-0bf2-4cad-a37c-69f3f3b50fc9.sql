
-- =============================================
-- FIX ALL EXISTING SJ TABLES RLS TO INCLUDE SUPER ADMIN
-- =============================================

-- SJ_COHORTS
DROP POLICY IF EXISTS sj_cohorts_select ON public.sj_cohorts;
DROP POLICY IF EXISTS sj_cohorts_insert ON public.sj_cohorts;
DROP POLICY IF EXISTS sj_cohorts_update ON public.sj_cohorts;
DROP POLICY IF EXISTS sj_cohorts_delete ON public.sj_cohorts;

CREATE POLICY sj_cohorts_select ON public.sj_cohorts FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_cohorts.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_cohorts_insert ON public.sj_cohorts FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_cohorts.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_cohorts_update ON public.sj_cohorts FOR UPDATE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_cohorts.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_cohorts_delete ON public.sj_cohorts FOR DELETE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_cohorts.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
);

-- SJ_PROFILES
DROP POLICY IF EXISTS sj_profiles_select ON public.sj_profiles;
DROP POLICY IF EXISTS sj_profiles_insert ON public.sj_profiles;
DROP POLICY IF EXISTS sj_profiles_update ON public.sj_profiles;
DROP POLICY IF EXISTS sj_profiles_delete ON public.sj_profiles;

CREATE POLICY sj_profiles_select ON public.sj_profiles FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_profiles.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_profiles_insert ON public.sj_profiles FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_profiles.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_profiles_update ON public.sj_profiles FOR UPDATE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_profiles.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_profiles_delete ON public.sj_profiles FOR DELETE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_profiles.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
);

-- SJ_ENROLLMENTS
DROP POLICY IF EXISTS sj_enrollments_select ON public.sj_enrollments;
DROP POLICY IF EXISTS sj_enrollments_insert ON public.sj_enrollments;
DROP POLICY IF EXISTS sj_enrollments_update ON public.sj_enrollments;
DROP POLICY IF EXISTS sj_enrollments_delete ON public.sj_enrollments;

CREATE POLICY sj_enrollments_select ON public.sj_enrollments FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_enrollments.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_enrollments_insert ON public.sj_enrollments FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_enrollments.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_enrollments_update ON public.sj_enrollments FOR UPDATE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_enrollments.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_enrollments_delete ON public.sj_enrollments FOR DELETE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_enrollments.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
);

-- SJ_TASKS
DROP POLICY IF EXISTS sj_tasks_select ON public.sj_tasks;
DROP POLICY IF EXISTS sj_tasks_insert ON public.sj_tasks;
DROP POLICY IF EXISTS sj_tasks_update ON public.sj_tasks;
DROP POLICY IF EXISTS sj_tasks_delete ON public.sj_tasks;

CREATE POLICY sj_tasks_select ON public.sj_tasks FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_tasks.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_tasks_insert ON public.sj_tasks FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_tasks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_tasks_update ON public.sj_tasks FOR UPDATE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_tasks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_tasks_delete ON public.sj_tasks FOR DELETE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_tasks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
);

-- SJ_TOUCHPOINTS
DROP POLICY IF EXISTS sj_touchpoints_select ON public.sj_touchpoints;
DROP POLICY IF EXISTS sj_touchpoints_insert ON public.sj_touchpoints;
DROP POLICY IF EXISTS sj_touchpoints_update ON public.sj_touchpoints;
DROP POLICY IF EXISTS sj_touchpoints_delete ON public.sj_touchpoints;

CREATE POLICY sj_touchpoints_select ON public.sj_touchpoints FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_touchpoints.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_touchpoints_insert ON public.sj_touchpoints FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_touchpoints.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_touchpoints_update ON public.sj_touchpoints FOR UPDATE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_touchpoints.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_touchpoints_delete ON public.sj_touchpoints FOR DELETE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_touchpoints.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
);

-- SJ_PERMISSIONS
DROP POLICY IF EXISTS sj_permissions_select ON public.sj_permissions;
DROP POLICY IF EXISTS sj_permissions_insert ON public.sj_permissions;
DROP POLICY IF EXISTS sj_permissions_update ON public.sj_permissions;
DROP POLICY IF EXISTS sj_permissions_delete ON public.sj_permissions;

CREATE POLICY sj_permissions_select ON public.sj_permissions FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_permissions.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_permissions_insert ON public.sj_permissions FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_permissions.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
);

CREATE POLICY sj_permissions_update ON public.sj_permissions FOR UPDATE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_permissions.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
);

CREATE POLICY sj_permissions_delete ON public.sj_permissions FOR DELETE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_permissions.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
);

-- SJ_AUDIT_LOGS
DROP POLICY IF EXISTS sj_audit_logs_select ON public.sj_audit_logs;
DROP POLICY IF EXISTS sj_audit_logs_insert ON public.sj_audit_logs;

CREATE POLICY sj_audit_logs_select ON public.sj_audit_logs FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_audit_logs.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_audit_logs_insert ON public.sj_audit_logs FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_audit_logs.workspace_id AND wm.user_id = auth.uid())
);

-- SJ_AI_SUGGESTIONS
DROP POLICY IF EXISTS "Users can manage SJ AI suggestions in their workspace" ON public.sj_ai_suggestions;
DROP POLICY IF EXISTS "Users can view SJ AI suggestions in their workspace" ON public.sj_ai_suggestions;

CREATE POLICY sj_ai_suggestions_select ON public.sj_ai_suggestions FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_ai_suggestions.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_ai_suggestions_all ON public.sj_ai_suggestions FOR ALL USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_ai_suggestions.workspace_id AND wm.user_id = auth.uid())
);

-- SJ_AUTOMATIONS
DROP POLICY IF EXISTS "Users can create SJ automations in their workspace" ON public.sj_automations;
DROP POLICY IF EXISTS "Users can delete non-system SJ automations in their workspace" ON public.sj_automations;
DROP POLICY IF EXISTS "Users can update SJ automations in their workspace" ON public.sj_automations;
DROP POLICY IF EXISTS "Users can view SJ automations in their workspace" ON public.sj_automations;

CREATE POLICY sj_automations_select ON public.sj_automations FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_automations.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_automations_insert ON public.sj_automations FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_automations.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_automations_update ON public.sj_automations FOR UPDATE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_automations.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_automations_delete ON public.sj_automations FOR DELETE USING (
  public.is_super_admin(auth.uid()) OR
  (is_system = false AND EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_automations.workspace_id AND wm.user_id = auth.uid()))
);

-- SJ_AUTOMATION_LOGS
DROP POLICY IF EXISTS "Users can create SJ automation logs in their workspace" ON public.sj_automation_logs;
DROP POLICY IF EXISTS "Users can view SJ automation logs in their workspace" ON public.sj_automation_logs;

CREATE POLICY sj_automation_logs_select ON public.sj_automation_logs FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_automation_logs.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_automation_logs_insert ON public.sj_automation_logs FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_automation_logs.workspace_id AND wm.user_id = auth.uid())
);

-- SJ_IMPORT_JOBS
DROP POLICY IF EXISTS sj_import_jobs_select ON public.sj_import_jobs;
DROP POLICY IF EXISTS sj_import_jobs_insert ON public.sj_import_jobs;
DROP POLICY IF EXISTS sj_import_jobs_update ON public.sj_import_jobs;
DROP POLICY IF EXISTS sj_import_jobs_delete ON public.sj_import_jobs;

CREATE POLICY sj_import_jobs_select ON public.sj_import_jobs FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_import_jobs.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY sj_import_jobs_insert ON public.sj_import_jobs FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_import_jobs.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_import_jobs_update ON public.sj_import_jobs FOR UPDATE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_import_jobs.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'agent'))
);

CREATE POLICY sj_import_jobs_delete ON public.sj_import_jobs FOR DELETE USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sj_import_jobs.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
);

-- SJ_INTERESTS_TAXONOMY (global, no workspace_id check needed for select)
DROP POLICY IF EXISTS sj_interests_taxonomy_select ON public.sj_interests_taxonomy;
DROP POLICY IF EXISTS sj_interests_taxonomy_insert ON public.sj_interests_taxonomy;
DROP POLICY IF EXISTS sj_interests_taxonomy_update ON public.sj_interests_taxonomy;
DROP POLICY IF EXISTS sj_interests_taxonomy_delete ON public.sj_interests_taxonomy;

CREATE POLICY sj_interests_taxonomy_select ON public.sj_interests_taxonomy FOR SELECT USING (true);

CREATE POLICY sj_interests_taxonomy_insert ON public.sj_interests_taxonomy FOR INSERT WITH CHECK (
  public.is_super_admin(auth.uid())
);

CREATE POLICY sj_interests_taxonomy_update ON public.sj_interests_taxonomy FOR UPDATE USING (
  public.is_super_admin(auth.uid())
);

CREATE POLICY sj_interests_taxonomy_delete ON public.sj_interests_taxonomy FOR DELETE USING (
  public.is_super_admin(auth.uid())
);
