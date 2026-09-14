-- =========================================================
-- FASE 2 — Evolução aditiva do modelo de produto
-- =========================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS gtin TEXT,
  ADD COLUMN IF NOT EXISTS mpn TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS schema_type TEXT,
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS problem_solved TEXT,
  ADD COLUMN IF NOT EXISTS use_cases TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS main_benefits TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS countries TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tax_class TEXT,
  ADD COLUMN IF NOT EXISTS activation_fee NUMERIC;

-- =========================================================
-- FASE 3 — Camada AI Commerce (1:1 com produto)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.product_ai_commerce (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ai_commerce_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_title TEXT,
  ai_short_description TEXT,
  ai_long_description TEXT,
  ai_category TEXT,
  ai_target_audience TEXT,
  ai_problem_solved TEXT,
  ai_use_cases TEXT[] DEFAULT '{}'::text[],
  ai_key_features TEXT[] DEFAULT '{}'::text[],
  ai_faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_keywords TEXT[] DEFAULT '{}'::text[],
  ai_recommendation_context TEXT,
  ai_exclusions TEXT,
  ai_last_validation TIMESTAMPTZ,
  ai_readiness_score INTEGER NOT NULL DEFAULT 0,
  ai_readiness_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_ai_commerce_ws ON public.product_ai_commerce(workspace_id);
CREATE INDEX IF NOT EXISTS idx_product_ai_commerce_enabled ON public.product_ai_commerce(workspace_id, ai_commerce_enabled);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_ai_commerce TO authenticated;
GRANT SELECT ON public.product_ai_commerce TO anon;
GRANT ALL ON public.product_ai_commerce TO service_role;

ALTER TABLE public.product_ai_commerce ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_commerce_select_members" ON public.product_ai_commerce
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "ai_commerce_insert_members" ON public.product_ai_commerce
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "ai_commerce_update_members" ON public.product_ai_commerce
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "ai_commerce_delete_members" ON public.product_ai_commerce
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- Leitura pública apenas de produtos com AI Commerce ativo e publicados na loja
CREATE POLICY "ai_commerce_select_public" ON public.product_ai_commerce
  FOR SELECT TO anon
  USING (
    ai_commerce_enabled = true
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_ai_commerce.product_id
        AND p.store_published = true
    )
  );

-- =========================================================
-- FASE 9 — Feed Engine
-- =========================================================
CREATE TABLE IF NOT EXISTS public.commerce_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('openai','google','meta','xml','json','csv')),
  format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json','xml','csv')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  language TEXT,
  country TEXT,
  public_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  last_generated_at TIMESTAMPTZ,
  last_status TEXT,
  last_product_count INTEGER NOT NULL DEFAULT 0,
  last_error_count INTEGER NOT NULL DEFAULT 0,
  last_warning_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_feeds_token ON public.commerce_feeds(public_token);
CREATE INDEX IF NOT EXISTS idx_commerce_feeds_ws ON public.commerce_feeds(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commerce_feeds TO authenticated;
GRANT ALL ON public.commerce_feeds TO service_role;

ALTER TABLE public.commerce_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commerce_feeds_members" ON public.commerce_feeds
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.commerce_feed_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  feed_id UUID NOT NULL REFERENCES public.commerce_feeds(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','error')),
  product_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_ms INTEGER,
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commerce_feed_runs_feed ON public.commerce_feed_runs(feed_id, created_at DESC);

GRANT SELECT ON public.commerce_feed_runs TO authenticated;
GRANT ALL ON public.commerce_feed_runs TO service_role;

ALTER TABLE public.commerce_feed_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commerce_feed_runs_select_members" ON public.commerce_feed_runs
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- =========================================================
-- FASE 10 — Tracking de AI Commerce
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ai_commerce_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit','product_view','lead','add_to_cart','checkout_start','purchase')),
  source TEXT,
  medium TEXT,
  campaign TEXT,
  referrer TEXT,
  landing_page TEXT,
  channel TEXT NOT NULL DEFAULT 'direct',
  is_ai_channel BOOLEAN NOT NULL DEFAULT false,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  session_id TEXT,
  customer_id UUID,
  order_id UUID,
  country TEXT,
  value NUMERIC,
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_commerce_events_ws_date ON public.ai_commerce_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_commerce_events_channel ON public.ai_commerce_events(workspace_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_commerce_events_session ON public.ai_commerce_events(session_id);

GRANT SELECT ON public.ai_commerce_events TO authenticated;
GRANT INSERT ON public.ai_commerce_events TO anon, authenticated;
GRANT ALL ON public.ai_commerce_events TO service_role;

ALTER TABLE public.ai_commerce_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_commerce_events_select_members" ON public.ai_commerce_events
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- Loja pública precisa de registar eventos (sem leitura).
CREATE POLICY "ai_commerce_events_insert_public" ON public.ai_commerce_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (value IS NULL OR value >= 0);

-- Trigger de updated_at reutilizando padrão existente
CREATE OR REPLACE FUNCTION public.touch_ai_commerce_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_ai_commerce_touch ON public.product_ai_commerce;
CREATE TRIGGER trg_product_ai_commerce_touch
  BEFORE UPDATE ON public.product_ai_commerce
  FOR EACH ROW EXECUTE FUNCTION public.touch_ai_commerce_updated_at();

DROP TRIGGER IF EXISTS trg_commerce_feeds_touch ON public.commerce_feeds;
CREATE TRIGGER trg_commerce_feeds_touch
  BEFORE UPDATE ON public.commerce_feeds
  FOR EACH ROW EXECUTE FUNCTION public.touch_ai_commerce_updated_at();