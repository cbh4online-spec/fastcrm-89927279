
-- ENUM níveis e estados
CREATE TYPE public.ambassador_tier AS ENUM ('iniciante','bronze','prata','ouro','diamante');
CREATE TYPE public.ambassador_referral_status AS ENUM ('lead','active','cancelled');
CREATE TYPE public.ambassador_payout_status AS ENUM ('pending','paid','rejected');

-- Tabela embaixadores
CREATE TABLE public.ambassadors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  slug TEXT NOT NULL UNIQUE,
  iban TEXT,
  nif TEXT,
  current_tier public.ambassador_tier NOT NULL DEFAULT 'iniciante',
  monthly_revenue_generated NUMERIC(12,2) NOT NULL DEFAULT 0,
  lifetime_revenue_generated NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  active_referrals_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ambassadors_user_id ON public.ambassadors(user_id);
CREATE INDEX idx_ambassadors_slug ON public.ambassadors(slug);

-- Referidos
CREATE TABLE public.ambassador_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id UUID NOT NULL REFERENCES public.ambassadors(id) ON DELETE CASCADE,
  referred_email TEXT,
  referred_name TEXT,
  referred_user_id UUID,
  status public.ambassador_referral_status NOT NULL DEFAULT 'lead',
  plan_code TEXT,
  monthly_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  annual_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  whatsapp_addon BOOLEAN NOT NULL DEFAULT false,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  converted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_referrals_ambassador ON public.ambassador_referrals(ambassador_id);
CREATE INDEX idx_referrals_status ON public.ambassador_referrals(status);

-- Comissões mensais
CREATE TABLE public.ambassador_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id UUID NOT NULL REFERENCES public.ambassadors(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.ambassador_referrals(id) ON DELETE SET NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  base_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tier_at_calculation public.ambassador_tier NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_commissions_ambassador ON public.ambassador_commissions(ambassador_id);
CREATE INDEX idx_commissions_period ON public.ambassador_commissions(period_year, period_month);

-- Pedidos de levantamento
CREATE TABLE public.ambassador_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id UUID NOT NULL REFERENCES public.ambassadors(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 50),
  status public.ambassador_payout_status NOT NULL DEFAULT 'pending',
  iban_snapshot TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  rejection_reason TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payouts_ambassador ON public.ambassador_payouts(ambassador_id);
CREATE INDEX idx_payouts_status ON public.ambassador_payouts(status);

-- Triggers updated_at
CREATE TRIGGER trg_ambassadors_updated BEFORE UPDATE ON public.ambassadors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ambassador_referrals_updated BEFORE UPDATE ON public.ambassador_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ambassador_payouts_updated BEFORE UPDATE ON public.ambassador_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_payouts ENABLE ROW LEVEL SECURITY;

-- Ambassadors: próprio embaixador vê/edita; super admin tudo
CREATE POLICY "Ambassador self select" ON public.ambassadors
  FOR SELECT USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));
CREATE POLICY "Ambassador self update" ON public.ambassadors
  FOR UPDATE USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));
CREATE POLICY "Ambassador admin insert" ON public.ambassadors
  FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "Ambassador admin delete" ON public.ambassadors
  FOR DELETE USING (public.is_super_admin(auth.uid()));

-- Referrals
CREATE POLICY "Referrals owner select" ON public.ambassador_referrals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ambassadors a WHERE a.id = ambassador_id AND a.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Referrals admin manage" ON public.ambassador_referrals
  FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Commissions
CREATE POLICY "Commissions owner select" ON public.ambassador_commissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ambassadors a WHERE a.id = ambassador_id AND a.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Commissions admin manage" ON public.ambassador_commissions
  FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Payouts: embaixador pode pedir, admin processa
CREATE POLICY "Payouts owner select" ON public.ambassador_payouts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ambassadors a WHERE a.id = ambassador_id AND a.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Payouts owner insert" ON public.ambassador_payouts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.ambassadors a WHERE a.id = ambassador_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Payouts admin update" ON public.ambassador_payouts
  FOR UPDATE USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Payouts admin delete" ON public.ambassador_payouts
  FOR DELETE USING (public.is_super_admin(auth.uid()));

-- Função: calcular tier por volume mensal
CREATE OR REPLACE FUNCTION public.leadchef_calc_ambassador_tier(_monthly_revenue NUMERIC)
RETURNS public.ambassador_tier
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _monthly_revenue >= 1500 THEN 'diamante'::public.ambassador_tier
    WHEN _monthly_revenue >= 500  THEN 'ouro'::public.ambassador_tier
    WHEN _monthly_revenue >= 200  THEN 'prata'::public.ambassador_tier
    WHEN _monthly_revenue >= 50   THEN 'bronze'::public.ambassador_tier
    ELSE 'iniciante'::public.ambassador_tier
  END;
$$;

CREATE OR REPLACE FUNCTION public.leadchef_tier_rate(_tier public.ambassador_tier)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _tier
    WHEN 'diamante' THEN 0.35
    WHEN 'ouro'     THEN 0.30
    WHEN 'prata'    THEN 0.25
    WHEN 'bronze'   THEN 0.20
    ELSE 0.15
  END;
$$;

-- Gerar slug único
CREATE OR REPLACE FUNCTION public.leadchef_generate_ambassador_slug(_full_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INTEGER := 0;
BEGIN
  base := lower(regexp_replace(unaccent(coalesce(_full_name,'amb')), '[^a-zA-Z0-9]+','-','g'));
  base := trim(both '-' from base);
  IF base = '' THEN base := 'amb'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.ambassadors WHERE slug = candidate) LOOP
    n := n + 1;
    candidate := base || '-' || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Pedido de payout: cria + debita saldo (RPC)
CREATE OR REPLACE FUNCTION public.leadchef_request_ambassador_payout(_amount NUMERIC)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amb public.ambassadors%ROWTYPE;
  v_payout_id UUID;
BEGIN
  SELECT * INTO v_amb FROM public.ambassadors WHERE user_id = auth.uid() LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Embaixador não encontrado'; END IF;
  IF _amount < 50 THEN RAISE EXCEPTION 'Valor mínimo de levantamento é 50€'; END IF;
  IF v_amb.available_balance < _amount THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;

  INSERT INTO public.ambassador_payouts (ambassador_id, amount, iban_snapshot)
  VALUES (v_amb.id, _amount, v_amb.iban)
  RETURNING id INTO v_payout_id;

  UPDATE public.ambassadors
     SET available_balance = available_balance - _amount,
         updated_at = now()
   WHERE id = v_amb.id;

  RETURN v_payout_id;
END;
$$;
