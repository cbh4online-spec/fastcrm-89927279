
-- campaign_experiments
CREATE TABLE public.campaign_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  base_campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  experiment_type TEXT NOT NULL DEFAULT 'subject',
  status TEXT NOT NULL DEFAULT 'draft',
  winning_variant_id UUID,
  evaluation_metric TEXT NOT NULL DEFAULT 'open_rate',
  min_sample_size INT NOT NULL DEFAULT 100,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- campaign_variants
CREATE TABLE public.campaign_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES public.campaign_experiments(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  variant_label TEXT NOT NULL DEFAULT 'A',
  traffic_split NUMERIC NOT NULL DEFAULT 50,
  open_rate NUMERIC DEFAULT 0,
  click_rate NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  revenue_attributed NUMERIC DEFAULT 0,
  sample_size INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ai_campaign_recommendations
CREATE TABLE public.ai_campaign_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  recommendation_data JSONB NOT NULL DEFAULT '{}',
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- campaign_benchmarks
CREATE TABLE public.campaign_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  period_days INT NOT NULL DEFAULT 30,
  metrics JSONB NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.campaign_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_campaign_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can manage experiments"
  ON public.campaign_experiments FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "workspace members can manage variants"
  ON public.campaign_variants FOR ALL TO authenticated
  USING (experiment_id IN (SELECT id FROM public.campaign_experiments WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())))
  WITH CHECK (experiment_id IN (SELECT id FROM public.campaign_experiments WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "workspace members can manage ai recommendations"
  ON public.ai_campaign_recommendations FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "workspace members can manage benchmarks"
  ON public.campaign_benchmarks FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Add winning_variant_id FK after campaign_variants exists
ALTER TABLE public.campaign_experiments
  ADD CONSTRAINT campaign_experiments_winning_variant_fkey
  FOREIGN KEY (winning_variant_id) REFERENCES public.campaign_variants(id) ON DELETE SET NULL;
