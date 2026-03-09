-- Add workspace_id to seo_page_analytics for workspace-scoped tracking
ALTER TABLE public.seo_page_analytics ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

-- Add page_url column for tracking which page the event occurred on
ALTER TABLE public.seo_page_analytics ADD COLUMN IF NOT EXISTS page_url text;
ALTER TABLE public.seo_page_analytics ADD COLUMN IF NOT EXISTS page_type text;

-- Create index for workspace queries
CREATE INDEX IF NOT EXISTS idx_seo_page_analytics_workspace ON public.seo_page_analytics(workspace_id, event_type, created_at DESC);

-- Update RLS: allow workspace members to read by workspace_id too
DROP POLICY IF EXISTS "Workspace members can read analytics" ON public.seo_page_analytics;
CREATE POLICY "Workspace members can read analytics" ON public.seo_page_analytics
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    OR entity_id IN (
      SELECT id FROM seo_entities WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );