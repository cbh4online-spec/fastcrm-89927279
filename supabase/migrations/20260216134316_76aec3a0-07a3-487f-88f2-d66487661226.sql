
-- Table for anonymous vertical landing page events (views + form submissions)
CREATE TABLE public.vertical_landing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_slug text NOT NULL,
  template_id uuid REFERENCES public.vertical_templates(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('view', 'form_submit')),
  session_id text NOT NULL,
  referrer text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for aggregation queries
CREATE INDEX idx_vertical_landing_events_slug ON public.vertical_landing_events(template_slug);
CREATE INDEX idx_vertical_landing_events_type ON public.vertical_landing_events(event_type);
CREATE INDEX idx_vertical_landing_events_created ON public.vertical_landing_events(created_at);
CREATE INDEX idx_vertical_landing_events_workspace ON public.vertical_landing_events(workspace_id);

-- Enable RLS
ALTER TABLE public.vertical_landing_events ENABLE ROW LEVEL SECURITY;

-- Public INSERT: any visitor can register events (anonymous tracking)
CREATE POLICY "Anyone can insert landing events"
  ON public.vertical_landing_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT: only authenticated workspace members can read analytics
CREATE POLICY "Workspace members can read landing events"
  ON public.vertical_landing_events
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );
