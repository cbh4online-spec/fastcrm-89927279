-- =========================================================
-- AI Commerce hardening — aditivo, sem remoções
-- =========================================================

-- 1) Configuração de critérios de readiness por workspace (override dos defaults do motor)
CREATE TABLE IF NOT EXISTS public.ai_commerce_readiness_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('error','warning')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, code)
);

CREATE INDEX IF NOT EXISTS idx_ai_commerce_readiness_config_ws
  ON public.ai_commerce_readiness_config(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_commerce_readiness_config TO authenticated;
GRANT ALL ON public.ai_commerce_readiness_config TO service_role;

ALTER TABLE public.ai_commerce_readiness_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_commerce_readiness_config_members" ON public.ai_commerce_readiness_config
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- 2) Feature flags / estado operacional por workspace
CREATE TABLE IF NOT EXISTS public.ai_commerce_settings (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  channel_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_commerce_settings TO authenticated;
GRANT ALL ON public.ai_commerce_settings TO service_role;

ALTER TABLE public.ai_commerce_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_commerce_settings_members" ON public.ai_commerce_settings
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- 3) Eventos: atribuição first/last touch, variante, deduplicação
ALTER TABLE public.ai_commerce_events
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS variant_id UUID,
  ADD COLUMN IF NOT EXISTS first_touch_source TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_medium TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_campaign TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_channel TEXT,
  ADD COLUMN IF NOT EXISTS last_touch_source TEXT,
  ADD COLUMN IF NOT EXISTS last_touch_medium TEXT,
  ADD COLUMN IF NOT EXISTS last_touch_campaign TEXT,
  ADD COLUMN IF NOT EXISTS last_touch_channel TEXT,
  ADD COLUMN IF NOT EXISTS server_verified BOOLEAN NOT NULL DEFAULT false;

-- Tipos de evento normalizados (alarga a lista sem invalidar histórico)
ALTER TABLE public.ai_commerce_events DROP CONSTRAINT IF EXISTS ai_commerce_events_event_type_check;
ALTER TABLE public.ai_commerce_events
  ADD CONSTRAINT ai_commerce_events_event_type_check CHECK (event_type IN (
    'visit','commerce_page_view','product_view','product_click','lead','lead_created',
    'add_to_cart','checkout_start','checkout_completed','purchase',
    'subscription_started','subscription_renewed','subscription_cancelled'
  ));

-- Idempotência: uma compra por encomenda; um evento por event_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_commerce_events_purchase_order
  ON public.ai_commerce_events(workspace_id, order_id)
  WHERE event_type = 'purchase' AND order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_commerce_events_event_id
  ON public.ai_commerce_events(workspace_id, event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_commerce_events_first_touch
  ON public.ai_commerce_events(workspace_id, first_touch_channel, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_commerce_events_product
  ON public.ai_commerce_events(workspace_id, product_id, created_at DESC);

-- 4) Endurecer o registo público: o navegador não pode declarar compras nem valores
DROP POLICY IF EXISTS "ai_commerce_events_insert_public" ON public.ai_commerce_events;
CREATE POLICY "ai_commerce_events_insert_public" ON public.ai_commerce_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    event_type IN ('visit','commerce_page_view','product_view','product_click','add_to_cart','checkout_start')
    AND value IS NULL
    AND order_id IS NULL
    AND customer_id IS NULL
    AND server_verified = false
  );

-- 5) Feeds: versão e proteção da última versão válida
ALTER TABLE public.commerce_feeds
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_valid_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_valid_version INTEGER,
  ADD COLUMN IF NOT EXISTS last_error_message TEXT;

ALTER TABLE public.commerce_feed_runs
  ADD COLUMN IF NOT EXISTS feed_version INTEGER,
  ADD COLUMN IF NOT EXISTS rejected_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS served BOOLEAN NOT NULL DEFAULT true;

-- 6) Produto: variante como fonte de preço mínima e condição/origem para feeds
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_condition TEXT,
  ADD COLUMN IF NOT EXISTS origin_country TEXT;

-- 7) Atribuição persistida na encomenda (aditivo, nullable)
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS first_touch_source TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_medium TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_campaign TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_channel TEXT,
  ADD COLUMN IF NOT EXISTS last_touch_source TEXT,
  ADD COLUMN IF NOT EXISTS last_touch_medium TEXT,
  ADD COLUMN IF NOT EXISTS last_touch_campaign TEXT,
  ADD COLUMN IF NOT EXISTS last_touch_channel TEXT,
  ADD COLUMN IF NOT EXISTS attribution_session_id TEXT;

-- 8) updated_at nas novas tabelas
DROP TRIGGER IF EXISTS trg_touch_ai_commerce_readiness_config ON public.ai_commerce_readiness_config;
CREATE TRIGGER trg_touch_ai_commerce_readiness_config
  BEFORE UPDATE ON public.ai_commerce_readiness_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_ai_commerce_updated_at();

DROP TRIGGER IF EXISTS trg_touch_ai_commerce_settings ON public.ai_commerce_settings;
CREATE TRIGGER trg_touch_ai_commerce_settings
  BEFORE UPDATE ON public.ai_commerce_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_ai_commerce_updated_at();
