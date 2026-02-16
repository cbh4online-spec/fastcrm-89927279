
-- Funnels table (replaces/extends landing_pages concept)
CREATE TABLE public.funnels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  domain TEXT,
  favicon_url TEXT,
  path TEXT,
  head_tracking_code TEXT,
  body_tracking_code TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

-- Funnel Steps (pages within a funnel)
CREATE TABLE public.funnel_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'page', -- page, optin, checkout, thankyou, upsell
  sort_order INTEGER NOT NULL DEFAULT 0,
  content JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Funnel Step Stats (page views, opt-ins, sales)
CREATE TABLE public.funnel_step_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.funnel_steps(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- page_view, unique_view, optin, sale
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC(12,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(step_id, event_type, event_date)
);

-- Funnel Tracking Events (Meta Pixel, etc.)
CREATE TABLE public.funnel_tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pixel_id TEXT NOT NULL,
  access_token TEXT,
  tracking_level TEXT DEFAULT 'standard',
  events_tracked TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Funnel Sales (transactions linked to funnel steps)
CREATE TABLE public.funnel_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.funnel_steps(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_email TEXT,
  product_name TEXT,
  transaction_id TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_step_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for funnels
CREATE POLICY "Users can view funnels in their workspace"
  ON public.funnels FOR SELECT
  USING (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "Users can create funnels in their workspace"
  ON public.funnels FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "Users can update funnels in their workspace"
  ON public.funnels FOR UPDATE
  USING (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete funnels in their workspace"
  ON public.funnels FOR DELETE
  USING (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

-- RLS Policies for funnel_steps
CREATE POLICY "Users can view funnel steps in their workspace"
  ON public.funnel_steps FOR SELECT
  USING (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage funnel steps in their workspace"
  ON public.funnel_steps FOR ALL
  USING (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

-- RLS Policies for funnel_step_stats
CREATE POLICY "Users can view funnel stats in their workspace"
  ON public.funnel_step_stats FOR SELECT
  USING (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage funnel stats in their workspace"
  ON public.funnel_step_stats FOR ALL
  USING (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

-- RLS Policies for funnel_tracking_events
CREATE POLICY "Users can view tracking events in their workspace"
  ON public.funnel_tracking_events FOR SELECT
  USING (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage tracking events in their workspace"
  ON public.funnel_tracking_events FOR ALL
  USING (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

-- RLS Policies for funnel_sales
CREATE POLICY "Users can view funnel sales in their workspace"
  ON public.funnel_sales FOR SELECT
  USING (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage funnel sales in their workspace"
  ON public.funnel_sales FOR ALL
  USING (workspace_id IN (
    SELECT w.id FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_funnel_steps_funnel ON public.funnel_steps(funnel_id);
CREATE INDEX idx_funnel_step_stats_step ON public.funnel_step_stats(step_id, event_date);
CREATE INDEX idx_funnel_sales_funnel ON public.funnel_sales(funnel_id);
CREATE INDEX idx_funnel_tracking_funnel ON public.funnel_tracking_events(funnel_id);

-- Updated_at trigger
CREATE TRIGGER update_funnels_updated_at
  BEFORE UPDATE ON public.funnels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funnel_steps_updated_at
  BEFORE UPDATE ON public.funnel_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
