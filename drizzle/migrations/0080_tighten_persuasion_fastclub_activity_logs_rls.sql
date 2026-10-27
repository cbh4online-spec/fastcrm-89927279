DROP POLICY IF EXISTS "Anyone can read persuasion structures" ON public.persuasion_structures;
CREATE POLICY "Signed-in users can read persuasion structures" ON public.persuasion_structures
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.persuasion_structures FROM anon;

DROP POLICY IF EXISTS "Authenticated can read challenges" ON public.fastclub_challenges;
CREATE POLICY "Workspace members can read challenges" ON public.fastclub_challenges
  FOR SELECT TO authenticated USING (
    workspace_id IS NULL
    OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = fastclub_challenges.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
CREATE POLICY "Members can insert own activity logs" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = activity_logs.workspace_id AND wm.user_id = auth.uid())
  );