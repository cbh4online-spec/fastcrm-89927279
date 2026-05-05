
-- 1. leadchef_lead_profiles
CREATE TABLE public.leadchef_lead_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'new',
  interest text,
  origin text,
  temperature text NOT NULL DEFAULT 'warm',
  next_action_type text,
  next_action_at timestamptz,
  next_action_note text,
  cycle jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_experience jsonb NOT NULL DEFAULT '{}'::jsonb,
  recruitment_potential boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leadchef_lead_profiles_workspace_lead_unique UNIQUE (workspace_id, lead_id),
  CONSTRAINT leadchef_lead_profiles_stage_chk CHECK (stage IN (
    'new','to_contact','in_conversation','demo_scheduled','demo_done',
    'proposal_decision','won','lost','reactivate_later'
  )),
  CONSTRAINT leadchef_lead_profiles_temp_chk CHECK (temperature IN ('cold','warm','hot'))
);

CREATE INDEX idx_leadchef_profiles_ws_stage ON public.leadchef_lead_profiles (workspace_id, stage);
CREATE INDEX idx_leadchef_profiles_ws_next_action ON public.leadchef_lead_profiles (workspace_id, next_action_at);
CREATE INDEX idx_leadchef_profiles_ws_lead ON public.leadchef_lead_profiles (workspace_id, lead_id);

ALTER TABLE public.leadchef_lead_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leadchef_profiles_ws_select" ON public.leadchef_lead_profiles
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_profiles_ws_insert" ON public.leadchef_lead_profiles
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_profiles_ws_update" ON public.leadchef_lead_profiles
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_profiles_ws_delete" ON public.leadchef_lead_profiles
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER trg_leadchef_profiles_updated_at
  BEFORE UPDATE ON public.leadchef_lead_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. leadchef_goals
CREATE TABLE public.leadchef_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  period_month date NOT NULL,
  leads_goal int NOT NULL DEFAULT 0,
  contacts_goal int NOT NULL DEFAULT 0,
  demos_goal int NOT NULL DEFAULT 0,
  sales_goal int NOT NULL DEFAULT 0,
  referrals_goal int NOT NULL DEFAULT 0,
  recruitment_goal int NOT NULL DEFAULT 0,
  income_goal numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leadchef_goals_unique UNIQUE (workspace_id, user_id, period_month)
);

CREATE INDEX idx_leadchef_goals_ws_user ON public.leadchef_goals (workspace_id, user_id, period_month);

ALTER TABLE public.leadchef_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leadchef_goals_ws_select" ON public.leadchef_goals
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_goals_ws_insert" ON public.leadchef_goals
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid());
CREATE POLICY "leadchef_goals_ws_update" ON public.leadchef_goals
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid())
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid());
CREATE POLICY "leadchef_goals_ws_delete" ON public.leadchef_goals
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid());

CREATE TRIGGER trg_leadchef_goals_updated_at
  BEFORE UPDATE ON public.leadchef_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. leadchef_referrals
CREATE TABLE public.leadchef_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  referred_by_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  referred_by_contact_id uuid,
  authorization_status text NOT NULL DEFAULT 'unknown',
  status text NOT NULL DEFAULT 'received',
  converted_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leadchef_referrals_status_chk CHECK (status IN (
    'received','to_contact','contacted','converted','no_authorization','not_interested','reactivate_later'
  )),
  CONSTRAINT leadchef_referrals_auth_chk CHECK (authorization_status IN ('unknown','granted','denied'))
);

CREATE INDEX idx_leadchef_referrals_ws_status ON public.leadchef_referrals (workspace_id, status);

ALTER TABLE public.leadchef_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leadchef_referrals_ws_select" ON public.leadchef_referrals
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_referrals_ws_insert" ON public.leadchef_referrals
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_referrals_ws_update" ON public.leadchef_referrals
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_referrals_ws_delete" ON public.leadchef_referrals
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER trg_leadchef_referrals_updated_at
  BEFORE UPDATE ON public.leadchef_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. leadchef_customer_experiences
CREATE TABLE public.leadchef_customer_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id uuid,
  household_size int,
  profession text,
  preferred_schedule text,
  current_device_model text,
  has_recipe_platform boolean,
  recipe_platform_active boolean,
  usage_frequency text,
  interests jsonb NOT NULL DEFAULT '[]'::jsonb,
  perceived_benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_purchase_option text,
  next_experience_type text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leadchef_cx_ws_lead ON public.leadchef_customer_experiences (workspace_id, lead_id);

ALTER TABLE public.leadchef_customer_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leadchef_cx_ws_select" ON public.leadchef_customer_experiences
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_cx_ws_insert" ON public.leadchef_customer_experiences
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_cx_ws_update" ON public.leadchef_customer_experiences
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leadchef_cx_ws_delete" ON public.leadchef_customer_experiences
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER trg_leadchef_cx_updated_at
  BEFORE UPDATE ON public.leadchef_customer_experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
