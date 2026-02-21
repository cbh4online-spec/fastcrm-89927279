CREATE POLICY "Public can view workspace for live bio pages"
ON public.workspaces
FOR SELECT
USING (
  id IN (
    SELECT DISTINCT bio_pages.workspace_id
    FROM bio_pages
    WHERE bio_pages.status = 'live'
  )
);