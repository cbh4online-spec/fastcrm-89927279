
-- =============================================
-- CHECKOUT SYSTEM: All tables for 5 phases
-- =============================================

-- Checkout Funnels
CREATE TABLE IF NOT EXISTS public.checkout_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(workspace_id, slug)
);

-- Checkout Funnel Steps
CREATE TABLE IF NOT EXISTS public.checkout_funnel_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.checkout_funnels(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL DEFAULT 'checkout', -- checkout, upsell, downsell, thank_you
  step_order INTEGER NOT NULL DEFAULT 0,
  offer_id UUID,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checkout Offers
CREATE TABLE IF NOT EXISTS public.checkout_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  offer_type TEXT NOT NULL DEFAULT 'upsell', -- upsell, downsell, cross_sell, order_bump, bundle
  product_id UUID,
  headline TEXT,
  subheadline TEXT,
  description TEXT,
  bullet_points JSONB DEFAULT '[]',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  compare_at_price NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  image_url TEXT,
  video_url TEXT,
  cta_text TEXT DEFAULT 'Sim! Quero isto!',
  decline_text TEXT DEFAULT 'Não, obrigado',
  guarantee_text TEXT,
  testimonials JSONB DEFAULT '[]',
  countdown_seconds INTEGER,
  scarcity_text TEXT,
  is_active BOOLEAN DEFAULT true,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checkout Order Bumps
CREATE TABLE IF NOT EXISTS public.checkout_order_bumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  funnel_id UUID REFERENCES public.checkout_funnels(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.checkout_offers(id) ON DELETE SET NULL,
  position TEXT DEFAULT 'before_payment', -- before_payment, after_payment, sidebar
  display_order INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checkout Offer Sequences
CREATE TABLE IF NOT EXISTS public.checkout_offer_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES public.checkout_funnels(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.checkout_offers(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  on_accept_next_offer_id UUID REFERENCES public.checkout_offers(id),
  on_decline_next_offer_id UUID REFERENCES public.checkout_offers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checkout One-Click Tokens
CREATE TABLE IF NOT EXISTS public.checkout_one_click_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_id UUID,
  customer_email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  token TEXT NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checkout Abandoned Carts
CREATE TABLE IF NOT EXISTS public.checkout_abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  funnel_id UUID REFERENCES public.checkout_funnels(id) ON DELETE SET NULL,
  session_id UUID,
  customer_email TEXT,
  customer_name TEXT,
  cart_data JSONB DEFAULT '{}',
  step_abandoned TEXT,
  recovery_status TEXT DEFAULT 'pending', -- pending, email_1_sent, email_2_sent, email_3_sent, recovered, expired
  recovery_token TEXT UNIQUE,
  discount_code TEXT,
  discount_amount NUMERIC(12,2),
  recovered_at TIMESTAMPTZ,
  total_value NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checkout Dynamic Discounts
CREATE TABLE IF NOT EXISTS public.checkout_dynamic_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'exit_intent', -- exit_intent, timer, cart_value, returning_visitor
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_cart_value NUMERIC(12,2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  countdown_seconds INTEGER,
  message TEXT,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checkout Quantity Breaks
CREATE TABLE IF NOT EXISTS public.checkout_quantity_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checkout Smart Bundles
CREATE TABLE IF NOT EXISTS public.checkout_smart_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  product_ids JSONB DEFAULT '[]',
  bundle_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  savings_percentage NUMERIC(5,2) DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checkout Sessions (analytics)
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  funnel_id UUID REFERENCES public.checkout_funnels(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  status TEXT DEFAULT 'started', -- started, checkout_completed, upsell_shown, upsell_accepted, upsell_declined, completed, abandoned
  current_step TEXT DEFAULT 'checkout',
  cart_data JSONB DEFAULT '{}',
  bumps_accepted JSONB DEFAULT '[]',
  upsells_shown JSONB DEFAULT '[]',
  upsells_accepted JSONB DEFAULT '[]',
  total_value NUMERIC(12,2) DEFAULT 0,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  one_click_token_id UUID,
  ab_test_id UUID,
  ab_variant TEXT,
  metadata JSONB DEFAULT '{}',
  device_type TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_address TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checkout A/B Tests
CREATE TABLE IF NOT EXISTS public.checkout_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  test_type TEXT DEFAULT 'funnel', -- funnel, offer, bump, page
  entity_id UUID,
  variant_a JSONB DEFAULT '{}',
  variant_b JSONB DEFAULT '{}',
  traffic_split NUMERIC(3,2) DEFAULT 0.50,
  status TEXT DEFAULT 'draft', -- draft, running, paused, completed
  winner TEXT,
  variant_a_sessions INTEGER DEFAULT 0,
  variant_a_conversions INTEGER DEFAULT 0,
  variant_b_sessions INTEGER DEFAULT 0,
  variant_b_conversions INTEGER DEFAULT 0,
  statistical_significance NUMERIC(5,2),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkout_funnels_workspace ON public.checkout_funnels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_checkout_funnels_slug ON public.checkout_funnels(workspace_id, slug);
CREATE INDEX IF NOT EXISTS idx_checkout_funnel_steps_funnel ON public.checkout_funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_checkout_offers_workspace ON public.checkout_offers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_workspace ON public.checkout_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_email ON public.checkout_sessions(customer_email);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON public.checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_checkout_abandoned_email ON public.checkout_abandoned_carts(customer_email);
CREATE INDEX IF NOT EXISTS idx_checkout_abandoned_status ON public.checkout_abandoned_carts(recovery_status);
CREATE INDEX IF NOT EXISTS idx_checkout_ab_tests_workspace ON public.checkout_ab_tests(workspace_id);

-- RLS
ALTER TABLE public.checkout_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_order_bumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_offer_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_one_click_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_dynamic_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_quantity_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_smart_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_ab_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workspace members can manage, service_role can do all
-- Funnels
CREATE POLICY "workspace_members_manage_funnels" ON public.checkout_funnels FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Public read for active funnels (checkout pages)
CREATE POLICY "public_read_active_funnels" ON public.checkout_funnels FOR SELECT TO anon
  USING (is_active = true);

-- Funnel Steps
CREATE POLICY "workspace_members_manage_funnel_steps" ON public.checkout_funnel_steps FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "public_read_funnel_steps" ON public.checkout_funnel_steps FOR SELECT TO anon USING (true);

-- Offers
CREATE POLICY "workspace_members_manage_offers" ON public.checkout_offers FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "public_read_active_offers" ON public.checkout_offers FOR SELECT TO anon
  USING (is_active = true);

-- Order Bumps
CREATE POLICY "workspace_members_manage_bumps" ON public.checkout_order_bumps FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "public_read_active_bumps" ON public.checkout_order_bumps FOR SELECT TO anon
  USING (is_active = true);

-- Offer Sequences
CREATE POLICY "workspace_members_manage_sequences" ON public.checkout_offer_sequences FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "public_read_sequences" ON public.checkout_offer_sequences FOR SELECT TO anon USING (true);

-- One-Click Tokens (service_role only for write, public read by token)
CREATE POLICY "service_role_manage_tokens" ON public.checkout_one_click_tokens FOR ALL TO service_role USING (true);

-- Abandoned Carts
CREATE POLICY "workspace_members_manage_abandoned" ON public.checkout_abandoned_carts FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "service_role_manage_abandoned" ON public.checkout_abandoned_carts FOR ALL TO service_role USING (true);

-- Dynamic Discounts
CREATE POLICY "workspace_members_manage_discounts" ON public.checkout_dynamic_discounts FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "public_read_active_discounts" ON public.checkout_dynamic_discounts FOR SELECT TO anon
  USING (is_active = true);

-- Quantity Breaks
CREATE POLICY "workspace_members_manage_qty_breaks" ON public.checkout_quantity_breaks FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "public_read_active_qty_breaks" ON public.checkout_quantity_breaks FOR SELECT TO anon
  USING (is_active = true);

-- Smart Bundles
CREATE POLICY "workspace_members_manage_bundles" ON public.checkout_smart_bundles FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "public_read_active_bundles" ON public.checkout_smart_bundles FOR SELECT TO anon
  USING (is_active = true);

-- Sessions
CREATE POLICY "workspace_members_read_sessions" ON public.checkout_sessions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "service_role_manage_sessions" ON public.checkout_sessions FOR ALL TO service_role USING (true);

CREATE POLICY "anon_insert_sessions" ON public.checkout_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_sessions" ON public.checkout_sessions FOR UPDATE TO anon USING (true);

-- A/B Tests
CREATE POLICY "workspace_members_manage_ab_tests" ON public.checkout_ab_tests FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
