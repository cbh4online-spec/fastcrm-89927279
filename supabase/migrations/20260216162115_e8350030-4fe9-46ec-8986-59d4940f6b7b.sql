
-- =============================================
-- BIO OS - Tables + RLS
-- =============================================

-- 1. bio_pages
CREATE TABLE public.bio_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  seo_title text,
  seo_description text,
  og_image text,
  primary_color text DEFAULT '#6366f1',
  background_style jsonb,
  custom_css text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

ALTER TABLE public.bio_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage bio_pages"
  ON public.bio_pages FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Public can view live bio_pages"
  ON public.bio_pages FOR SELECT
  USING (status = 'live');

-- 2. bio_blocks
CREATE TABLE public.bio_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bio_page_id uuid NOT NULL REFERENCES public.bio_pages(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  order_index integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  rules jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bio_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage bio_blocks"
  ON public.bio_blocks FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Public can view visible bio_blocks"
  ON public.bio_blocks FOR SELECT
  USING (
    is_visible = true
    AND bio_page_id IN (SELECT id FROM public.bio_pages WHERE status = 'live')
  );

-- 3. bio_events (tracking)
CREATE TABLE public.bio_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid,
  bio_page_id uuid NOT NULL REFERENCES public.bio_pages(id) ON DELETE CASCADE,
  block_id uuid,
  event_type text NOT NULL,
  source text,
  device text,
  referrer text,
  utm_json jsonb,
  visitor_id text,
  revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bio_events ENABLE ROW LEVEL SECURITY;

-- Public insert for anonymous tracking
CREATE POLICY "Anyone can insert bio_events"
  ON public.bio_events FOR INSERT
  WITH CHECK (true);

-- Workspace members can read
CREATE POLICY "Workspace members can read bio_events"
  ON public.bio_events FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 4. bio_analytics_daily
CREATE TABLE public.bio_analytics_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bio_page_id uuid NOT NULL REFERENCES public.bio_pages(id) ON DELETE CASCADE,
  date date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  uniques integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  top_links jsonb,
  top_sources jsonb,
  UNIQUE(bio_page_id, date)
);

ALTER TABLE public.bio_analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read bio_analytics_daily"
  ON public.bio_analytics_daily FOR SELECT
  USING (
    bio_page_id IN (
      SELECT id FROM public.bio_pages
      WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "System can manage bio_analytics_daily"
  ON public.bio_analytics_daily FOR ALL
  USING (
    bio_page_id IN (
      SELECT id FROM public.bio_pages
      WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    bio_page_id IN (
      SELECT id FROM public.bio_pages
      WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    )
  );

-- 5. bio_qr_codes
CREATE TABLE public.bio_qr_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bio_page_id uuid NOT NULL REFERENCES public.bio_pages(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text,
  short_code text NOT NULL UNIQUE,
  scans integer NOT NULL DEFAULT 0,
  uniques integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bio_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage bio_qr_codes"
  ON public.bio_qr_codes FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Trigger for updated_at on bio_pages
CREATE TRIGGER update_bio_pages_updated_at
  BEFORE UPDATE ON public.bio_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_bio_blocks_page ON public.bio_blocks(bio_page_id, order_index);
CREATE INDEX idx_bio_events_page ON public.bio_events(bio_page_id, created_at);
CREATE INDEX idx_bio_events_type ON public.bio_events(event_type);
CREATE INDEX idx_bio_pages_workspace ON public.bio_pages(workspace_id, status);
