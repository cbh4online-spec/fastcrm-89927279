
-- Table: ebook_views (reading sessions)
CREATE TABLE public.ebook_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  reader_email TEXT,
  reader_name TEXT,
  contact_id UUID,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  country TEXT,
  pages_viewed INT NOT NULL DEFAULT 0,
  max_page_reached INT NOT NULL DEFAULT 0,
  total_pages INT NOT NULL DEFAULT 0,
  time_on_book_seconds INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: ebook_page_events (granular per-page events)
CREATE TABLE public.ebook_page_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ebook_view_id UUID NOT NULL REFERENCES public.ebook_views(id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'page_view',
  duration_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add lead_gate_enabled to ebooks
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS lead_gate_enabled BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.ebook_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_page_events ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can SELECT
CREATE POLICY "Workspace members can read ebook_views"
  ON public.ebook_views FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can read ebook_page_events"
  ON public.ebook_page_events FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS: anyone (anon) can INSERT views and events (public tracking)
CREATE POLICY "Anyone can insert ebook_views"
  ON public.ebook_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can insert ebook_page_events"
  ON public.ebook_page_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- RLS: anon can UPDATE own session (heartbeat)
CREATE POLICY "Anon can update own ebook_views by session"
  ON public.ebook_views FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_ebook_views_ebook_id ON public.ebook_views(ebook_id);
CREATE INDEX idx_ebook_views_workspace_id ON public.ebook_views(workspace_id);
CREATE INDEX idx_ebook_views_started_at ON public.ebook_views(started_at);
CREATE INDEX idx_ebook_page_events_view_id ON public.ebook_page_events(ebook_view_id);
CREATE INDEX idx_ebook_page_events_ebook_id ON public.ebook_page_events(ebook_id);
