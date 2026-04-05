
-- Tabela de regras de margem mínima
CREATE TABLE public.product_pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  applies_to TEXT NOT NULL DEFAULT 'category' CHECK (applies_to IN ('all', 'category', 'product')),
  min_margin_pct NUMERIC NOT NULL DEFAULT 10,
  target_margin_pct NUMERIC DEFAULT 25,
  max_margin_pct NUMERIC DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select_pricing_rules"
  ON public.product_pricing_rules FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "workspace_members_insert_pricing_rules"
  ON public.product_pricing_rules FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "workspace_members_update_pricing_rules"
  ON public.product_pricing_rules FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "workspace_members_delete_pricing_rules"
  ON public.product_pricing_rules FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX idx_pricing_rules_workspace ON public.product_pricing_rules(workspace_id);
CREATE INDEX idx_pricing_rules_category ON public.product_pricing_rules(workspace_id, category);

-- Tabela de resultados de pesquisa de mercado
CREATE TABLE public.product_market_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  market_avg_price NUMERIC,
  market_min_price NUMERIC,
  market_max_price NUMERIC,
  competitors_json JSONB DEFAULT '[]'::jsonb,
  suggested_price NUMERIC,
  suggested_margin_pct NUMERIC,
  research_source TEXT DEFAULT 'ai',
  model_used TEXT,
  research_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_market_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select_market_research"
  ON public.product_market_research FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "workspace_members_insert_market_research"
  ON public.product_market_research FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX idx_market_research_product ON public.product_market_research(product_id);
CREATE INDEX idx_market_research_workspace ON public.product_market_research(workspace_id);
