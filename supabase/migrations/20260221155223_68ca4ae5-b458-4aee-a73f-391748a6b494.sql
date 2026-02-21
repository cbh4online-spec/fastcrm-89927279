-- bio_events: actualizar politica de leitura
DROP POLICY IF EXISTS "Workspace members can read bio_events" ON public.bio_events;
CREATE POLICY "Workspace members or super admins can read bio_events"
ON public.bio_events FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);

-- bio_analytics_daily: actualizar politica de leitura
DROP POLICY IF EXISTS "Workspace members can read bio_analytics_daily" ON public.bio_analytics_daily;
CREATE POLICY "Workspace members or super admins can read bio_analytics_daily"
ON public.bio_analytics_daily FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR bio_page_id IN (
    SELECT id FROM bio_pages
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  )
);