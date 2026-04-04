
-- ============================================================
-- SISTEMA DE AFILIADOS — MIGRAÇÃO COMPLETA
-- ============================================================

-- 1. affiliate_settings (configurações globais por workspace)
CREATE TABLE public.affiliate_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auto_approve_affiliates BOOLEAN NOT NULL DEFAULT false,
  default_cookie_days INTEGER NOT NULL DEFAULT 30,
  min_payout_amount NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  payout_currency TEXT NOT NULL DEFAULT 'EUR',
  terms_url TEXT,
  welcome_message TEXT,
  registration_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view affiliate settings"
  ON public.affiliate_settings FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can manage affiliate settings"
  ON public.affiliate_settings FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 2. affiliate_programs
CREATE TABLE public.affiliate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_commission_percent NUMERIC(5,2) DEFAULT 10.00,
  default_commission_fixed NUMERIC(10,2),
  commission_type TEXT NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent', 'fixed', 'hybrid')),
  cookie_duration_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allows_sub_affiliates BOOLEAN NOT NULL DEFAULT false,
  sub_affiliate_commission_percent NUMERIC(5,2) DEFAULT 5.00,
  applicable_modules TEXT[] DEFAULT ARRAY['store']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage affiliate programs"
  ON public.affiliate_programs FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 3. affiliate_program_tiers
CREATE TABLE public.affiliate_program_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.affiliate_programs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL,
  commission_fixed NUMERIC(10,2),
  min_sales_count INTEGER DEFAULT 0,
  min_sales_value NUMERIC(12,2) DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_program_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage affiliate tiers"
  ON public.affiliate_program_tiers FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 4. affiliate_program_rules
CREATE TABLE public.affiliate_program_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.affiliate_programs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL DEFAULT 'product' CHECK (rule_type IN ('product', 'category', 'module')),
  target_id TEXT,
  target_label TEXT,
  commission_percent NUMERIC(5,2),
  commission_fixed NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_program_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage affiliate rules"
  ON public.affiliate_program_rules FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 5. affiliates
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.affiliate_programs(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  website_url TEXT,
  affiliate_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  parent_affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  current_tier_id UUID REFERENCES public.affiliate_program_tiers(id) ON DELETE SET NULL,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, affiliate_code),
  UNIQUE(workspace_id, email)
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Affiliates can see their own record
CREATE POLICY "Affiliates can view own record"
  ON public.affiliates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Members can manage all affiliates in workspace
CREATE POLICY "Members can manage affiliates"
  ON public.affiliates FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Allow self-registration (insert own record)
CREATE POLICY "Users can register as affiliate"
  ON public.affiliates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6. affiliate_links
CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  campaign_name TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  short_code TEXT,
  click_count INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can manage own links"
  ON public.affiliate_links FOR ALL
  TO authenticated
  USING (
    affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid())
    OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  )
  WITH CHECK (
    affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid())
    OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  );

-- 7. affiliate_clicks
CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  referrer_url TEXT,
  landing_page TEXT,
  country_code TEXT,
  is_unique BOOLEAN NOT NULL DEFAULT true,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own clicks"
  ON public.affiliate_clicks FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid())
    OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  );

-- Insert only via service_role (Edge Functions)
CREATE POLICY "Service role can insert clicks"
  ON public.affiliate_clicks FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 8. affiliate_conversions
CREATE TABLE public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  source_module TEXT NOT NULL DEFAULT 'store' CHECK (source_module IN ('store', 'marketplace', 'saas', 'other')),
  order_id UUID,
  subscription_id UUID,
  external_ref TEXT,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,2),
  commission_fixed NUMERIC(10,2),
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  parent_conversion_id UUID REFERENCES public.affiliate_conversions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'refunded')),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  notes TEXT,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own conversions"
  ON public.affiliate_conversions FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid())
    OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  );

-- Members can manage conversions
CREATE POLICY "Members can manage conversions"
  ON public.affiliate_conversions FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Service role insert (from Edge Functions)
CREATE POLICY "Service role can insert conversions"
  ON public.affiliate_conversions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 9. affiliate_balances
CREATE TABLE public.affiliate_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE UNIQUE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_pending NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own balance"
  ON public.affiliate_balances FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid())
    OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  );

-- Only service_role can modify balances
CREATE POLICY "Service role can manage balances"
  ON public.affiliate_balances FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 10. affiliate_payouts
CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  method TEXT NOT NULL DEFAULT 'manual' CHECK (method IN ('manual', 'stripe', 'credit', 'paypal', 'bank_transfer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  stripe_payout_id TEXT,
  stripe_transfer_id TEXT,
  reference_note TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own payouts"
  ON public.affiliate_payouts FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid())
    OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  );

-- Members can manage payouts
CREATE POLICY "Members can manage payouts"
  ON public.affiliate_payouts FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 11. affiliate_payout_methods
CREATE TABLE public.affiliate_payout_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('iban', 'paypal', 'stripe_connect', 'other')),
  label TEXT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_payout_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can manage own payout methods"
  ON public.affiliate_payout_methods FOR ALL
  TO authenticated
  USING (
    affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid())
    OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  )
  WITH CHECK (
    affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid())
    OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  );

-- 12. affiliate_notifications
CREATE TABLE public.affiliate_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('conversion', 'payout', 'tier_upgrade', 'approval', 'info')),
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own notifications"
  ON public.affiliate_notifications FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid())
    OR workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  );

CREATE POLICY "Affiliates can update own notifications"
  ON public.affiliate_notifications FOR UPDATE
  TO authenticated
  USING (affiliate_id IN (SELECT a.id FROM public.affiliates a WHERE a.user_id = auth.uid()));

-- Service role for inserting notifications
CREATE POLICY "Service role can insert notifications"
  ON public.affiliate_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_affiliate_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_affiliate_settings_updated
  BEFORE UPDATE ON public.affiliate_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_affiliate_updated_at();

CREATE TRIGGER trg_affiliates_updated
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_affiliate_updated_at();

CREATE TRIGGER trg_affiliate_payout_methods_updated
  BEFORE UPDATE ON public.affiliate_payout_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_affiliate_updated_at();

-- Auto-create balance row when affiliate is created
CREATE OR REPLACE FUNCTION public.auto_create_affiliate_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.affiliate_balances (affiliate_id, workspace_id)
  VALUES (NEW.id, NEW.workspace_id)
  ON CONFLICT (affiliate_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_affiliate_balance
  AFTER INSERT ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_affiliate_balance();

-- Update affiliate stats on conversion approval
CREATE OR REPLACE FUNCTION public.update_affiliate_on_conversion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    -- Update affiliate totals
    UPDATE public.affiliates
    SET total_conversions = total_conversions + 1,
        total_revenue = total_revenue + NEW.commission_amount
    WHERE id = NEW.affiliate_id;

    -- Update balance
    UPDATE public.affiliate_balances
    SET total_earned = total_earned + NEW.commission_amount,
        available_balance = available_balance + NEW.commission_amount,
        updated_at = now()
    WHERE affiliate_id = NEW.affiliate_id;
  END IF;

  IF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
    -- Reverse
    UPDATE public.affiliates
    SET total_conversions = GREATEST(0, total_conversions - 1),
        total_revenue = GREATEST(0, total_revenue - OLD.commission_amount)
    WHERE id = NEW.affiliate_id;

    UPDATE public.affiliate_balances
    SET total_earned = GREATEST(0, total_earned - OLD.commission_amount),
        available_balance = GREATEST(0, available_balance - OLD.commission_amount),
        updated_at = now()
    WHERE affiliate_id = NEW.affiliate_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_affiliate_on_conversion
  AFTER INSERT OR UPDATE OF status ON public.affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_affiliate_on_conversion();

-- Update balance on payout completion
CREATE OR REPLACE FUNCTION public.update_balance_on_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    UPDATE public.affiliate_balances
    SET total_paid = total_paid + NEW.amount,
        available_balance = GREATEST(0, available_balance - NEW.amount),
        updated_at = now()
    WHERE affiliate_id = NEW.affiliate_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_balance_on_payout
  AFTER INSERT OR UPDATE OF status ON public.affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_balance_on_payout();

-- Generate unique affiliate code
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  exists_count INTEGER;
BEGIN
  IF NEW.affiliate_code IS NULL OR NEW.affiliate_code = '' THEN
    LOOP
      new_code := UPPER(SUBSTR(MD5(gen_random_uuid()::TEXT), 1, 8));
      SELECT COUNT(*) INTO exists_count FROM public.affiliates WHERE affiliate_code = new_code AND workspace_id = NEW.workspace_id;
      EXIT WHEN exists_count = 0;
    END LOOP;
    NEW.affiliate_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_affiliate_code
  BEFORE INSERT ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.generate_affiliate_code();

-- Indexes
CREATE INDEX idx_affiliates_workspace ON public.affiliates(workspace_id);
CREATE INDEX idx_affiliates_code ON public.affiliates(workspace_id, affiliate_code);
CREATE INDEX idx_affiliates_user ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_status ON public.affiliates(workspace_id, status);
CREATE INDEX idx_affiliate_clicks_affiliate ON public.affiliate_clicks(affiliate_id);
CREATE INDEX idx_affiliate_clicks_time ON public.affiliate_clicks(clicked_at);
CREATE INDEX idx_affiliate_conversions_affiliate ON public.affiliate_conversions(affiliate_id);
CREATE INDEX idx_affiliate_conversions_status ON public.affiliate_conversions(workspace_id, status);
CREATE INDEX idx_affiliate_conversions_order ON public.affiliate_conversions(order_id);
CREATE INDEX idx_affiliate_payouts_affiliate ON public.affiliate_payouts(affiliate_id);
CREATE INDEX idx_affiliate_links_affiliate ON public.affiliate_links(affiliate_id);
CREATE INDEX idx_affiliate_notifications_affiliate ON public.affiliate_notifications(affiliate_id, is_read);
