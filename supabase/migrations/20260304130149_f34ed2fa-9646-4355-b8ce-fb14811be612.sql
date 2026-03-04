
-- ============================================================
-- C2C Affiliate & Referral System — 11 Tables + RLS + Indexes
-- ============================================================

-- 1) c2c_affiliate_programs
CREATE TABLE public.c2c_affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Programa de Afiliados',
  status text NOT NULL DEFAULT 'active',
  default_commission_type text NOT NULL DEFAULT 'percent',
  default_commission_value numeric NOT NULL DEFAULT 10,
  cookie_window_days integer NOT NULL DEFAULT 30,
  attribution_model text NOT NULL DEFAULT 'last_click',
  payout_hold_days integer NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_c2c_affiliate_programs_ws ON public.c2c_affiliate_programs(workspace_id);
ALTER TABLE public.c2c_affiliate_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view affiliate programs" ON public.c2c_affiliate_programs
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage affiliate programs" ON public.c2c_affiliate_programs
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- 2) c2c_affiliates
CREATE TABLE public.c2c_affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.c2c_affiliate_programs(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  affiliate_code text NOT NULL,
  total_clicks integer NOT NULL DEFAULT 0,
  total_conversions integer NOT NULL DEFAULT 0,
  total_earnings numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id, user_id),
  UNIQUE(affiliate_code)
);
CREATE INDEX idx_c2c_affiliates_ws ON public.c2c_affiliates(workspace_id);
CREATE INDEX idx_c2c_affiliates_user ON public.c2c_affiliates(user_id);
ALTER TABLE public.c2c_affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own affiliate" ON public.c2c_affiliates
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own affiliate" ON public.c2c_affiliates
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage affiliates" ON public.c2c_affiliates
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- 3) c2c_affiliate_links
CREATE TABLE public.c2c_affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.c2c_affiliates(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  target_type text NOT NULL DEFAULT 'marketplace_home',
  target_id text,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_c2c_affiliate_links_aff ON public.c2c_affiliate_links(affiliate_id);
ALTER TABLE public.c2c_affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates see own links" ON public.c2c_affiliate_links
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.c2c_affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Affiliates create links" ON public.c2c_affiliate_links
  FOR INSERT TO authenticated
  WITH CHECK (affiliate_id IN (SELECT id FROM public.c2c_affiliates WHERE user_id = auth.uid()));

-- 4) c2c_affiliate_clicks
CREATE TABLE public.c2c_affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.c2c_affiliate_programs(id) ON DELETE CASCADE,
  affiliate_id uuid NOT NULL REFERENCES public.c2c_affiliates(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  visitor_fingerprint_hash text,
  ip_hash text,
  user_agent_hash text,
  referrer_url text,
  landing_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_c2c_affiliate_clicks_aff ON public.c2c_affiliate_clicks(affiliate_id);
CREATE INDEX idx_c2c_affiliate_clicks_session ON public.c2c_affiliate_clicks(session_id);
CREATE INDEX idx_c2c_affiliate_clicks_created ON public.c2c_affiliate_clicks(created_at);
ALTER TABLE public.c2c_affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role inserts clicks" ON public.c2c_affiliate_clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Affiliates see own clicks" ON public.c2c_affiliate_clicks
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.c2c_affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Admins see all clicks" ON public.c2c_affiliate_clicks
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- 5) c2c_affiliate_attributions
CREATE TABLE public.c2c_affiliate_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.c2c_affiliate_programs(id) ON DELETE CASCADE,
  affiliate_id uuid NOT NULL REFERENCES public.c2c_affiliates(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id text,
  listing_id text,
  commission_type text NOT NULL DEFAULT 'percent',
  commission_value numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  hold_until timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_c2c_affiliate_attr_aff ON public.c2c_affiliate_attributions(affiliate_id);
CREATE INDEX idx_c2c_affiliate_attr_status ON public.c2c_affiliate_attributions(status);
ALTER TABLE public.c2c_affiliate_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates see own attributions" ON public.c2c_affiliate_attributions
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.c2c_affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage attributions" ON public.c2c_affiliate_attributions
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- 6) c2c_referral_programs
CREATE TABLE public.c2c_referral_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Programa de Referências',
  status text NOT NULL DEFAULT 'active',
  reward_type text NOT NULL DEFAULT 'credit',
  reward_value numeric NOT NULL DEFAULT 5,
  trigger_event text NOT NULL DEFAULT 'first_purchase',
  hold_days integer NOT NULL DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_c2c_referral_programs_ws ON public.c2c_referral_programs(workspace_id);
ALTER TABLE public.c2c_referral_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view referral programs" ON public.c2c_referral_programs
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage referral programs" ON public.c2c_referral_programs
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- 7) c2c_referrals
CREATE TABLE public.c2c_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.c2c_referral_programs(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid,
  referred_email text,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now(),
  qualified_at timestamptz,
  UNIQUE(program_id, referral_code)
);
CREATE INDEX idx_c2c_referrals_referrer ON public.c2c_referrals(referrer_user_id);
CREATE INDEX idx_c2c_referrals_code ON public.c2c_referrals(referral_code);
ALTER TABLE public.c2c_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own referrals" ON public.c2c_referrals
  FOR SELECT TO authenticated USING (referrer_user_id = auth.uid());

CREATE POLICY "Users create referrals" ON public.c2c_referrals
  FOR INSERT TO authenticated WITH CHECK (referrer_user_id = auth.uid());

CREATE POLICY "Admins manage referrals" ON public.c2c_referrals
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- 8) c2c_referral_attributions
CREATE TABLE public.c2c_referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.c2c_referrals(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id text,
  reward_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  hold_until timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_c2c_referral_attr_ref ON public.c2c_referral_attributions(referral_id);
ALTER TABLE public.c2c_referral_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own referral attributions" ON public.c2c_referral_attributions
  FOR SELECT TO authenticated
  USING (referral_id IN (SELECT id FROM public.c2c_referrals WHERE referrer_user_id = auth.uid()));

CREATE POLICY "Admins manage referral attributions" ON public.c2c_referral_attributions
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- 9) c2c_payouts
CREATE TABLE public.c2c_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  payout_type text NOT NULL DEFAULT 'affiliate_commission',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'queued',
  method text NOT NULL DEFAULT 'manual_iban',
  period_start timestamptz,
  period_end timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX idx_c2c_payouts_user ON public.c2c_payouts(user_id);
CREATE INDEX idx_c2c_payouts_status ON public.c2c_payouts(status);
CREATE INDEX idx_c2c_payouts_ws ON public.c2c_payouts(workspace_id);
ALTER TABLE public.c2c_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own payouts" ON public.c2c_payouts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins manage payouts" ON public.c2c_payouts
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- 10) c2c_order_events
CREATE TABLE public.c2c_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_c2c_order_events_order ON public.c2c_order_events(order_id);
ALTER TABLE public.c2c_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see order events" ON public.c2c_order_events
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "Service insert order events" ON public.c2c_order_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- 11) c2c_platform_fees
CREATE TABLE public.c2c_platform_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  fee_type text NOT NULL DEFAULT 'percent',
  fee_value numeric NOT NULL DEFAULT 5,
  applies_to text NOT NULL DEFAULT 'all',
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, applies_to, category)
);
ALTER TABLE public.c2c_platform_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view platform fees" ON public.c2c_platform_fees
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage platform fees" ON public.c2c_platform_fees
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));
