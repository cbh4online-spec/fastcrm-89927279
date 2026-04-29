-- ============================================================
-- MOTOR UNIFICADO DE CAMPANHAS E REGRAS DE PREÇO
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.campaign_mechanic AS ENUM (
    'percentage_discount',
    'fixed_amount_discount',
    'fixed_price',
    'bogo',
    'buy_n_get_n_pct',
    'bundle',
    'volume_tiered',
    'free_shipping',
    'gift_product',
    'cashback',
    'store_credit',
    'cart_progressive',
    'flash_sale',
    'happy_hour',
    'seasonal',
    'launch_price',
    'clearance',
    'first_purchase',
    'birthday',
    'referral',
    'loyalty'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_status AS ENUM ('draft','scheduled','active','paused','expired','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_channel AS ENUM ('store_b2c','marketplace_c2c','b2b','crm','all');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_audience AS ENUM ('all','new_customers','returning','vip','segment','b2b_tier','geo','birthday','referral','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_type AS ENUM ('public','private','single_use','multi_use','auto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1) campaigns (cabeçalho)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  internal_code text,
  mechanic public.campaign_mechanic NOT NULL,
  status public.campaign_status NOT NULL DEFAULT 'draft',

  -- Janela temporal
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text DEFAULT 'Europe/Lisbon',
  weekdays int[] DEFAULT NULL,                -- 0..6 (dom..sáb) — NULL = todos
  hour_start smallint,                         -- 0..23 (Happy Hour)
  hour_end smallint,

  -- Prioridade & empilhamento
  priority int NOT NULL DEFAULT 0,
  stackable boolean NOT NULL DEFAULT false,
  exclusive_group text,                        -- ex: "black_friday" — só uma ativa do grupo

  -- Canais
  channels public.campaign_channel[] NOT NULL DEFAULT ARRAY['all']::public.campaign_channel[],

  -- Audiência
  audience public.campaign_audience NOT NULL DEFAULT 'all',
  audience_config jsonb NOT NULL DEFAULT '{}'::jsonb,   -- segmentos, tiers, países, etc.

  -- Cupão
  requires_coupon boolean NOT NULL DEFAULT false,

  -- Mecânica detalhada (JSON flexível por tipo)
  -- ex BOGO: {"buy_qty":2,"get_qty":1,"get_discount_pct":100}
  -- ex Volume: {"tiers":[{"min_qty":3,"discount_pct":10},{"min_qty":5,"discount_pct":15}]}
  -- ex Bundle: {"products":[{"product_id":"...","qty":1}],"bundle_price":99}
  -- ex Cart progressive: {"steps":[{"min_cart":50,"discount":5},{"min_cart":100,"discount":15}]}
  -- ex Cashback: {"percent":5,"as":"store_credit"}
  -- ex Gift: {"product_id":"...","qty":1,"min_cart":50}
  mechanic_config jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Targeting de produtos
  target_scope text NOT NULL DEFAULT 'all',    -- 'all'|'category'|'product'|'brand'|'tag'
  product_ids uuid[],
  category_slugs text[],
  brand_slugs text[],
  tag_slugs text[],
  excluded_product_ids uuid[],

  -- Limites
  max_total_uses int,
  max_uses_per_customer int,
  max_total_budget numeric(14,2),              -- desconto máximo concedido (€)
  min_cart_value numeric(12,2),
  min_quantity int,

  -- A/B
  ab_variant text,                              -- 'A'|'B'|NULL
  ab_traffic_pct smallint DEFAULT 100,

  -- Compliance PT (Omnibus — preço mais baixo dos últimos 30 dias)
  enforce_omnibus boolean NOT NULL DEFAULT true,

  -- Contadores (atualizados via trigger no redemption)
  uses_count int NOT NULL DEFAULT 0,
  revenue_generated numeric(14,2) NOT NULL DEFAULT 0,
  discount_given numeric(14,2) NOT NULL DEFAULT 0,

  -- Meta
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,

  CONSTRAINT campaigns_window_chk CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CONSTRAINT campaigns_hours_chk CHECK (hour_start IS NULL OR (hour_start BETWEEN 0 AND 23)),
  CONSTRAINT campaigns_hourend_chk CHECK (hour_end IS NULL OR (hour_end BETWEEN 0 AND 23))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_ws_status ON public.campaigns(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_active_window ON public.campaigns(workspace_id, starts_at, ends_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_campaigns_mechanic ON public.campaigns(workspace_id, mechanic);
CREATE INDEX IF NOT EXISTS idx_campaigns_channels ON public.campaigns USING GIN (channels);
CREATE INDEX IF NOT EXISTS idx_campaigns_products ON public.campaigns USING GIN (product_ids);
CREATE INDEX IF NOT EXISTS idx_campaigns_categories ON public.campaigns USING GIN (category_slugs);

-- ============================================================
-- 2) campaign_rules (condições/ações por linha)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaign_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  eval_order int NOT NULL DEFAULT 0,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {min_cart, min_qty, products_required, customer_tag, ...}
  action jsonb NOT NULL DEFAULT '{}'::jsonb,      -- {type:'percent', value:10} | {type:'fixed', value:5} | {type:'free_shipping'} | {type:'gift', product_id, qty}
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_rules_campaign ON public.campaign_rules(campaign_id, eval_order);

-- ============================================================
-- 3) campaign_coupons
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaign_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code text NOT NULL,
  coupon_type public.coupon_type NOT NULL DEFAULT 'public',
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,  -- privado de um cliente
  max_uses int,
  max_uses_per_customer int DEFAULT 1,
  uses_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_coupons_code_unique UNIQUE (workspace_id, code)
);
CREATE INDEX IF NOT EXISTS idx_campaign_coupons_code ON public.campaign_coupons(workspace_id, code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_campaign_coupons_campaign ON public.campaign_coupons(campaign_id);

-- ============================================================
-- 4) campaign_redemptions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaign_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  coupon_id uuid REFERENCES public.campaign_coupons(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  order_id uuid,
  proposal_id uuid,
  channel public.campaign_channel,
  cart_value numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_campaign ON public.campaign_redemptions(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_contact ON public.campaign_redemptions(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_order ON public.campaign_redemptions(order_id) WHERE order_id IS NOT NULL;

-- ============================================================
-- 5) campaign_targets (multi-target opcional)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaign_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  target_kind text NOT NULL,            -- 'segment'|'tier'|'country'|'region'|'tag'|'channel'
  target_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign ON public.campaign_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_kind ON public.campaign_targets(workspace_id, target_kind, target_value);

-- ============================================================
-- Triggers updated_at
-- ============================================================
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Trigger: actualizar contadores em campaigns ao registar redemption
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_campaign_redemption_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.campaigns
     SET uses_count = uses_count + 1,
         revenue_generated = revenue_generated + COALESCE(NEW.cart_value, 0),
         discount_given = discount_given + COALESCE(NEW.discount_amount, 0),
         updated_at = now()
   WHERE id = NEW.campaign_id;

  IF NEW.coupon_id IS NOT NULL THEN
    UPDATE public.campaign_coupons
       SET uses_count = uses_count + 1
     WHERE id = NEW.coupon_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_campaign_redemption_counters ON public.campaign_redemptions;
CREATE TRIGGER trg_campaign_redemption_counters
  AFTER INSERT ON public.campaign_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.fn_campaign_redemption_counters();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_targets ENABLE ROW LEVEL SECURITY;

-- campaigns
CREATE POLICY "ws_members_select_campaigns" ON public.campaigns
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "ws_members_insert_campaigns" ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "ws_members_update_campaigns" ON public.campaigns
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "ws_members_delete_campaigns" ON public.campaigns
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Leitura pública de campanhas activas (loja e marketplace) - apenas dados básicos via view depois
CREATE POLICY "public_read_active_campaigns" ON public.campaigns
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));

-- campaign_rules
CREATE POLICY "ws_members_manage_campaign_rules" ON public.campaign_rules
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- campaign_coupons
CREATE POLICY "ws_members_manage_coupons" ON public.campaign_coupons
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- campaign_redemptions: leitura para membros, insert via service_role/RPC
CREATE POLICY "ws_members_select_redemptions" ON public.campaign_redemptions
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "ws_members_insert_redemptions" ON public.campaign_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- campaign_targets
CREATE POLICY "ws_members_manage_targets" ON public.campaign_targets
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- ============================================================
-- RPC: validar cupão (público, sem auth)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_campaign_coupon(
  p_workspace_id uuid,
  p_code text,
  p_contact_id uuid DEFAULT NULL
)
RETURNS TABLE (
  valid boolean,
  reason text,
  campaign_id uuid,
  coupon_id uuid,
  mechanic public.campaign_mechanic,
  mechanic_config jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_coupon record;
  v_campaign record;
BEGIN
  SELECT * INTO v_coupon
    FROM public.campaign_coupons
   WHERE workspace_id = p_workspace_id
     AND code = p_code
     AND is_active = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'coupon_not_found'::text, NULL::uuid, NULL::uuid, NULL::public.campaign_mechanic, NULL::jsonb;
    RETURN;
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN QUERY SELECT false, 'coupon_expired'::text, NULL::uuid, v_coupon.id, NULL::public.campaign_mechanic, NULL::jsonb;
    RETURN;
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, 'coupon_exhausted'::text, NULL::uuid, v_coupon.id, NULL::public.campaign_mechanic, NULL::jsonb;
    RETURN;
  END IF;

  IF v_coupon.coupon_type = 'private' AND v_coupon.contact_id IS DISTINCT FROM p_contact_id THEN
    RETURN QUERY SELECT false, 'coupon_not_for_customer'::text, NULL::uuid, v_coupon.id, NULL::public.campaign_mechanic, NULL::jsonb;
    RETURN;
  END IF;

  SELECT * INTO v_campaign
    FROM public.campaigns
   WHERE id = v_coupon.campaign_id
     AND status = 'active'
     AND (starts_at IS NULL OR starts_at <= now())
     AND (ends_at IS NULL OR ends_at >= now())
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'campaign_inactive'::text, v_coupon.campaign_id, v_coupon.id, NULL::public.campaign_mechanic, NULL::jsonb;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'ok'::text, v_campaign.id, v_coupon.id, v_campaign.mechanic, v_campaign.mechanic_config;
END $$;

GRANT EXECUTE ON FUNCTION public.validate_campaign_coupon(uuid, text, uuid) TO anon, authenticated;