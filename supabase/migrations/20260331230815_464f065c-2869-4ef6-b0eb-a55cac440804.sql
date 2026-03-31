
-- Add SEO + consent fields to funnels
ALTER TABLE public.funnels
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS noindex BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_text TEXT,
  ADD COLUMN IF NOT EXISTS consent_text_version TEXT,
  ADD COLUMN IF NOT EXISTS privacy_policy_url TEXT,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_label TEXT;

-- Create funnel_submissions table
CREATE TABLE IF NOT EXISTS public.funnel_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.funnel_steps(id) ON DELETE SET NULL,
  contact_id UUID,
  data JSONB DEFAULT '{}',
  source_url TEXT,
  consent_given BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  consent_text_version TEXT,
  marketing_opt_in BOOLEAN DEFAULT false,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  device_type TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.funnel_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funnel_submissions_anon_insert" ON public.funnel_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "funnel_submissions_workspace_select" ON public.funnel_submissions
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Create funnel_events table
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.funnel_steps(id) ON DELETE SET NULL,
  contact_id UUID,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_value TEXT,
  device_type TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel_type ON public.funnel_events(funnel_id, event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_events_workspace ON public.funnel_events(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON public.funnel_events(session_id);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funnel_events_anon_insert" ON public.funnel_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "funnel_events_workspace_select" ON public.funnel_events
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );
