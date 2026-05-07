
-- ============================================
-- FASE 1Z — Customer Success, Health Score & Retention Engine
-- ============================================

-- 1. CUSTOMER ACCOUNTS
CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  company_id uuid,
  contact_id uuid,
  subscription_id uuid,
  plan_id uuid,
  package_id uuid,
  customer_success_owner_id uuid,
  support_owner_id uuid,
  implementation_project_id uuid,
  onboarding_project_id uuid,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  lifecycle_stage text NOT NULL DEFAULT 'post_go_live',
  go_live_date date,
  renewal_date date,
  contract_start_date date,
  contract_end_date date,
  mrr numeric,
  arr numeric,
  currency text DEFAULT 'EUR',
  segment text,
  vertical text,
  health_score numeric,
  health_status text DEFAULT 'unknown',
  churn_risk_score numeric,
  expansion_score numeric,
  last_checkin_at timestamptz,
  next_checkin_at timestamptz,
  last_qbr_at timestamptz,
  next_qbr_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_workspace ON public.customer_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_status ON public.customer_accounts(status);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_health ON public.customer_accounts(health_status);

-- 2. HEALTH SCORE SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.customer_health_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  workspace_id uuid,
  period_start timestamptz,
  period_end timestamptz,
  overall_score numeric NOT NULL,
  health_status text NOT NULL,
  adoption_score numeric,
  usage_score numeric,
  support_score numeric,
  value_score numeric,
  engagement_score numeric,
  satisfaction_score numeric,
  financial_score numeric,
  risk_score numeric,
  expansion_score numeric,
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculated_by text NOT NULL DEFAULT 'system',
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chss_account ON public.customer_health_score_snapshots(customer_account_id, created_at DESC);

-- 3. SIGNALS
CREATE TABLE IF NOT EXISTS public.customer_success_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  workspace_id uuid,
  signal_type text NOT NULL,
  signal_category text,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  source_entity_type text,
  source_entity_id uuid,
  status text NOT NULL DEFAULT 'open',
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_css_signals_account ON public.customer_success_signals(customer_account_id);
CREATE INDEX IF NOT EXISTS idx_css_signals_status ON public.customer_success_signals(status);

-- 4. CHURN RISKS
CREATE TABLE IF NOT EXISTS public.customer_churn_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  workspace_id uuid,
  risk_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  probability numeric,
  estimated_mrr_at_risk numeric,
  currency text DEFAULT 'EUR',
  title text NOT NULL,
  description text,
  recommended_action text,
  owner_id uuid,
  status text NOT NULL DEFAULT 'open',
  detected_by text NOT NULL DEFAULT 'system',
  detected_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ccr_account ON public.customer_churn_risks(customer_account_id);
CREATE INDEX IF NOT EXISTS idx_ccr_status ON public.customer_churn_risks(status);

-- 5. EXPANSION OPPORTUNITIES
CREATE TABLE IF NOT EXISTS public.customer_expansion_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  workspace_id uuid,
  opportunity_type text NOT NULL,
  title text NOT NULL,
  description text,
  recommended_plan_id uuid,
  recommended_addon_id uuid,
  estimated_mrr_increase numeric,
  estimated_setup_fee numeric,
  currency text DEFAULT 'EUR',
  confidence numeric,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'suggested',
  owner_id uuid,
  source text NOT NULL DEFAULT 'system',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ceo_account ON public.customer_expansion_opportunities(customer_account_id);
CREATE INDEX IF NOT EXISTS idx_ceo_status ON public.customer_expansion_opportunities(status);

-- 6. CHECK-INS
CREATE TABLE IF NOT EXISTS public.customer_success_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  workspace_id uuid,
  owner_id uuid,
  checkin_type text NOT NULL DEFAULT 'regular',
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_at timestamptz,
  completed_at timestamptz,
  channel text,
  summary text,
  notes text,
  customer_feedback text,
  next_steps text,
  health_before numeric,
  health_after numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_csc_account ON public.customer_success_checkins(customer_account_id);
CREATE INDEX IF NOT EXISTS idx_csc_scheduled ON public.customer_success_checkins(scheduled_at);

-- 7. QBR REVIEWS
CREATE TABLE IF NOT EXISTS public.customer_qbr_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  workspace_id uuid,
  owner_id uuid,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  completed_at timestamptz,
  executive_summary text,
  value_delivered jsonb NOT NULL DEFAULT '[]'::jsonb,
  usage_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  support_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  revenue_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_period_goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  shared_with_customer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qbr_account ON public.customer_qbr_reviews(customer_account_id);

-- 8. PLAYBOOKS
CREATE TABLE IF NOT EXISTS public.customer_success_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  playbook_type text,
  trigger_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  templates jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. SUCCESS TASKS
CREATE TABLE IF NOT EXISTS public.customer_success_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  workspace_id uuid,
  owner_id uuid,
  related_risk_id uuid,
  related_expansion_id uuid,
  related_checkin_id uuid,
  title text NOT NULL,
  description text,
  task_type text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cst_account ON public.customer_success_tasks(customer_account_id);
CREATE INDEX IF NOT EXISTS idx_cst_status ON public.customer_success_tasks(status);

-- 10. FEEDBACK SURVEYS (CSAT/NPS prep)
CREATE TABLE IF NOT EXISTS public.customer_feedback_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  workspace_id uuid,
  survey_type text,
  score numeric,
  comment text,
  source text,
  status text NOT NULL DEFAULT 'received',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cfs_account ON public.customer_feedback_surveys(customer_account_id);

-- ============================================
-- TRIGGERS updated_at
-- ============================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customer_accounts','customer_success_signals','customer_churn_risks',
    'customer_expansion_opportunities','customer_success_checkins',
    'customer_qbr_reviews','customer_success_playbooks','customer_success_tasks'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%s', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_health_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_success_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_churn_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_expansion_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_success_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_qbr_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_success_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_success_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_feedback_surveys ENABLE ROW LEVEL SECURITY;

-- Workspace-scoped policies
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customer_accounts','customer_health_score_snapshots','customer_success_signals',
    'customer_churn_risks','customer_expansion_opportunities','customer_success_checkins',
    'customer_qbr_reviews','customer_success_tasks','customer_feedback_surveys'
  ]) LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "ws_members_select_%1$s" ON public.%1$s;
      CREATE POLICY "ws_members_select_%1$s" ON public.%1$s FOR SELECT
      USING (
        public.is_super_admin(auth.uid())
        OR (workspace_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = %1$s.workspace_id AND wm.user_id = auth.uid()
        ))
      );
      DROP POLICY IF EXISTS "ws_members_write_%1$s" ON public.%1$s;
      CREATE POLICY "ws_members_write_%1$s" ON public.%1$s FOR ALL
      USING (
        public.is_super_admin(auth.uid())
        OR (workspace_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = %1$s.workspace_id AND wm.user_id = auth.uid()
        ))
      )
      WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (workspace_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = %1$s.workspace_id AND wm.user_id = auth.uid()
        ))
      );
    $f$, t);
  END LOOP;
END $$;

-- Playbooks: globais, leitura para autenticados, escrita para super admin
DROP POLICY IF EXISTS "playbooks_read_all" ON public.customer_success_playbooks;
CREATE POLICY "playbooks_read_all" ON public.customer_success_playbooks FOR SELECT
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "playbooks_super_admin_write" ON public.customer_success_playbooks;
CREATE POLICY "playbooks_super_admin_write" ON public.customer_success_playbooks FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
