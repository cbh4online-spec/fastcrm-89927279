
-- B1: Add SEO + consent fields to ebooks
ALTER TABLE public.ebooks
  ADD COLUMN IF NOT EXISTS privacy_policy_url TEXT,
  ADD COLUMN IF NOT EXISTS consent_text TEXT,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_label TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS noindex BOOLEAN NOT NULL DEFAULT false;

-- Add consent fields to ebook_views
ALTER TABLE public.ebook_views
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_text_version TEXT,
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent_string TEXT;

-- Create ebook_ctas table
CREATE TABLE public.ebook_ctas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  chapter_id TEXT,
  label TEXT NOT NULL,
  cta_type TEXT NOT NULL DEFAULT 'link',
  target_url TEXT,
  position TEXT NOT NULL DEFAULT 'end',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ebook_ctas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ebook_ctas_select_workspace" ON public.ebook_ctas
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "ebook_ctas_insert_workspace" ON public.ebook_ctas
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "ebook_ctas_update_workspace" ON public.ebook_ctas
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "ebook_ctas_delete_workspace" ON public.ebook_ctas
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Create ebook_cta_events table
CREATE TABLE public.ebook_cta_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  cta_id UUID NOT NULL REFERENCES public.ebook_ctas(id) ON DELETE CASCADE,
  view_id UUID REFERENCES public.ebook_views(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  chapter_id TEXT,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ebook_cta_events ENABLE ROW LEVEL SECURITY;

-- Public insert for anonymous tracking (like ebook_views)
CREATE POLICY "ebook_cta_events_insert_anon" ON public.ebook_cta_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Workspace members can read
CREATE POLICY "ebook_cta_events_select_workspace" ON public.ebook_cta_events
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
