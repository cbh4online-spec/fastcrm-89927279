
-- 1. Enrich store_visitor_sessions with consent data
ALTER TABLE public.store_visitor_sessions
  ADD COLUMN IF NOT EXISTS consent_analytics boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_marketing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gdpr_visitor_id text;

-- 2. Create store_tracking_events table
CREATE TABLE public.store_tracking_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  page_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_store_tracking_events_workspace_created
  ON public.store_tracking_events (workspace_id, created_at DESC);
CREATE INDEX idx_store_tracking_events_session
  ON public.store_tracking_events (session_id);
CREATE INDEX idx_store_tracking_events_type
  ON public.store_tracking_events (event_type);

-- 3. RLS
ALTER TABLE public.store_tracking_events ENABLE ROW LEVEL SECURITY;

-- Workspace members can read events
CREATE POLICY "Workspace members can view store tracking events"
  ON public.store_tracking_events
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

-- Anonymous visitors can insert events (public store pages)
CREATE POLICY "Anyone can insert store tracking events"
  ON public.store_tracking_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
