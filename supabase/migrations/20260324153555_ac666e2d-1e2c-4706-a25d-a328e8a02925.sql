
-- Competitors registry
CREATE TABLE IF NOT EXISTS public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  website_url text NOT NULL,
  tracked_pages text[] NOT NULL DEFAULT ARRAY['/', '/pricing', '/features'],
  notes text,
  last_scraped_at timestamptz,
  last_change_detected_at timestamptz,
  changes_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_competitors" ON public.competitors
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- Content snapshots per competitor page
CREATE TABLE IF NOT EXISTS public.competitor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  page_url text NOT NULL,
  content_hash text NOT NULL,
  content_preview text,
  has_changed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_competitor
  ON public.competitor_snapshots(competitor_id, page_path, created_at DESC);

ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_snapshots" ON public.competitor_snapshots
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- Add enrichment tracking columns to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS enrichment_source text,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS firecrawl_data jsonb;
