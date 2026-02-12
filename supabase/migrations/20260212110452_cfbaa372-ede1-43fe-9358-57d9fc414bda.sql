
-- =============================================
-- FASE A: FastMatch Engine — Tabelas + Motor de Quotas
-- =============================================

-- 1. fastmatch_profiles
CREATE TABLE public.fastmatch_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  member_id UUID REFERENCES public.community_members(id) ON DELETE SET NULL,
  company_name TEXT,
  industry TEXT,
  target_audience TEXT,
  ticket_range TEXT,
  services_offered TEXT[],
  services_needed TEXT[],
  bio TEXT,
  website_url TEXT,
  linkedin_url TEXT,
  reputation_score NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  reputation_count INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_founder BOOLEAN NOT NULL DEFAULT false,
  founder_quota_override INTEGER,
  founder_expiry_date TIMESTAMPTZ,
  match_quota_monthly INTEGER NOT NULL DEFAULT 1,
  match_used_current_period INTEGER NOT NULL DEFAULT 0,
  extra_credits_balance INTEGER NOT NULL DEFAULT 0,
  period_reset_date TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  strategic_score INTEGER,
  strategic_reasons JSONB,
  last_score_update TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- 2. fastmatch_interests
CREATE TABLE public.fastmatch_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_profile_id UUID NOT NULL REFERENCES public.fastmatch_profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES public.fastmatch_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'mutual', 'expired', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_profile_id, to_profile_id)
);

-- 3. fastmatch_connections
CREATE TABLE public.fastmatch_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_a_id UUID NOT NULL REFERENCES public.fastmatch_profiles(id) ON DELETE CASCADE,
  profile_b_id UUID NOT NULL REFERENCES public.fastmatch_profiles(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlocked_by UUID NOT NULL,
  credits_consumed INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'quota' CHECK (source IN ('quota', 'extra_credits')),
  crm_opportunity_id UUID,
  crm_contact_id UUID,
  crm_company_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. fastmatch_reputation_reviews
CREATE TABLE public.fastmatch_reputation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.fastmatch_connections(id) ON DELETE CASCADE,
  reviewer_profile_id UUID NOT NULL REFERENCES public.fastmatch_profiles(id) ON DELETE CASCADE,
  reviewed_profile_id UUID NOT NULL REFERENCES public.fastmatch_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, reviewer_profile_id)
);

-- Indexes
CREATE INDEX idx_fastmatch_profiles_workspace ON public.fastmatch_profiles(workspace_id);
CREATE INDEX idx_fastmatch_profiles_user ON public.fastmatch_profiles(user_id);
CREATE INDEX idx_fastmatch_interests_from ON public.fastmatch_interests(from_profile_id);
CREATE INDEX idx_fastmatch_interests_to ON public.fastmatch_interests(to_profile_id);
CREATE INDEX idx_fastmatch_interests_workspace ON public.fastmatch_interests(workspace_id);
CREATE INDEX idx_fastmatch_connections_profiles ON public.fastmatch_connections(profile_a_id, profile_b_id);
CREATE INDEX idx_fastmatch_connections_workspace ON public.fastmatch_connections(workspace_id);
CREATE INDEX idx_fastmatch_reviews_reviewed ON public.fastmatch_reputation_reviews(reviewed_profile_id);

-- Updated_at trigger for profiles
CREATE TRIGGER update_fastmatch_profiles_updated_at
  BEFORE UPDATE ON public.fastmatch_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.fastmatch_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fastmatch_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fastmatch_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fastmatch_reputation_reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: all authenticated workspace members can view, own user can manage
CREATE POLICY "Members can view workspace profiles"
  ON public.fastmatch_profiles FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE id = workspace_id));

CREATE POLICY "Users can insert own profile"
  ON public.fastmatch_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.fastmatch_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Interests: user can manage own, view received
CREATE POLICY "Users can view own interests"
  ON public.fastmatch_interests FOR SELECT TO authenticated
  USING (
    from_profile_id IN (SELECT id FROM public.fastmatch_profiles WHERE user_id = auth.uid())
    OR to_profile_id IN (SELECT id FROM public.fastmatch_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create interests"
  ON public.fastmatch_interests FOR INSERT TO authenticated
  WITH CHECK (
    from_profile_id IN (SELECT id FROM public.fastmatch_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own interests"
  ON public.fastmatch_interests FOR UPDATE TO authenticated
  USING (
    from_profile_id IN (SELECT id FROM public.fastmatch_profiles WHERE user_id = auth.uid())
  );

-- Connections: participants can view
CREATE POLICY "Participants can view connections"
  ON public.fastmatch_connections FOR SELECT TO authenticated
  USING (
    profile_a_id IN (SELECT id FROM public.fastmatch_profiles WHERE user_id = auth.uid())
    OR profile_b_id IN (SELECT id FROM public.fastmatch_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert connections"
  ON public.fastmatch_connections FOR INSERT TO authenticated
  WITH CHECK (
    profile_a_id IN (SELECT id FROM public.fastmatch_profiles WHERE user_id = auth.uid())
    OR profile_b_id IN (SELECT id FROM public.fastmatch_profiles WHERE user_id = auth.uid())
  );

-- Reviews: participants can view and create
CREATE POLICY "Anyone can view reviews"
  ON public.fastmatch_reputation_reviews FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Connection participants can create reviews"
  ON public.fastmatch_reputation_reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_profile_id IN (SELECT id FROM public.fastmatch_profiles WHERE user_id = auth.uid())
  );

-- =============================================
-- Consume Quota Function
-- =============================================

CREATE OR REPLACE FUNCTION public.consume_fastmatch_quota(
  p_profile_id UUID,
  p_workspace_id UUID
)
RETURNS TABLE(success BOOLEAN, source TEXT, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile fastmatch_profiles%ROWTYPE;
  v_effective_quota INTEGER;
BEGIN
  SELECT * INTO v_profile
  FROM fastmatch_profiles
  WHERE id = p_profile_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ''::text, 'Perfil não encontrado'::text;
    RETURN;
  END IF;

  -- Determine effective quota (founder override if active)
  IF v_profile.is_founder AND v_profile.founder_expiry_date IS NOT NULL AND v_profile.founder_expiry_date > now() AND v_profile.founder_quota_override IS NOT NULL THEN
    v_effective_quota := v_profile.founder_quota_override;
  ELSE
    v_effective_quota := v_profile.match_quota_monthly;
  END IF;

  -- Check quota
  IF v_profile.match_used_current_period < v_effective_quota THEN
    UPDATE fastmatch_profiles
    SET match_used_current_period = match_used_current_period + 1
    WHERE id = p_profile_id;

    RETURN QUERY SELECT true, 'quota'::text, 'Match desbloqueado com sucesso'::text;
    RETURN;
  END IF;

  -- Check extra credits
  IF v_profile.extra_credits_balance > 0 THEN
    UPDATE fastmatch_profiles
    SET extra_credits_balance = extra_credits_balance - 1
    WHERE id = p_profile_id;

    RETURN QUERY SELECT true, 'extra_credits'::text, 'Match desbloqueado com crédito extra'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, ''::text, 'Quota mensal atingida. Atualize o plano ou compre créditos extra.'::text;
END;
$$;

-- =============================================
-- Reset Quotas Function (for cron)
-- =============================================

CREATE OR REPLACE FUNCTION public.reset_fastmatch_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset used quotas for profiles whose period has expired
  UPDATE fastmatch_profiles
  SET
    match_used_current_period = 0,
    period_reset_date = date_trunc('month', now()) + interval '1 month'
  WHERE period_reset_date <= now();

  -- Revert expired founders to standard quota
  UPDATE fastmatch_profiles
  SET
    is_founder = false,
    founder_quota_override = NULL,
    founder_expiry_date = NULL
  WHERE is_founder = true
    AND founder_expiry_date IS NOT NULL
    AND founder_expiry_date <= now();
END;
$$;

-- Super admin policies
CREATE POLICY "Super admins can manage profiles"
  ON public.fastmatch_profiles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage interests"
  ON public.fastmatch_interests FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage connections"
  ON public.fastmatch_connections FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage reviews"
  ON public.fastmatch_reputation_reviews FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));
