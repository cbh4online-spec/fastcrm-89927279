-- =========================================================
-- FASE 1L — BILLING PLANS & COMMERCIAL PACKAGING
-- =========================================================

-- 1. CATÁLOGO GLOBAL DE PLANOS
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  public_description text,
  audience text,
  promise text,
  monthly_price numeric,
  annual_price numeric,
  currency text NOT NULL DEFAULT 'EUR',
  billing_interval text NOT NULL DEFAULT 'monthly',
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  recommended boolean NOT NULL DEFAULT false,
  enterprise boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_plans_code_check CHECK (code = ANY (ARRAY['free','starter','growth','pro','enterprise','custom']))
);

CREATE INDEX IF NOT EXISTS idx_billing_plans_active ON public.billing_plans(is_active, sort_order);

-- 2. FEATURES POR PLANO
CREATE TABLE IF NOT EXISTS public.billing_plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.billing_plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  feature_description text,
  included boolean NOT NULL DEFAULT true,
  limit_value numeric,
  limit_unit text,
  display_value text,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_billing_plan_features_plan ON public.billing_plan_features(plan_id);

-- 3. ADD-ONS
CREATE TABLE IF NOT EXISTS public.billing_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  unit_name text,
  price_per_unit numeric,
  currency text NOT NULL DEFAULT 'EUR',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. ADD-ONS POR WORKSPACE
CREATE TABLE IF NOT EXISTS public.workspace_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES public.billing_addons(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_addons_status_check CHECK (status = ANY (ARRAY['pending','active','paused','cancelled','expired']))
);

CREATE INDEX IF NOT EXISTS idx_workspace_addons_ws ON public.workspace_addons(workspace_id, status);

-- 5. PEDIDOS DE ALTERAÇÃO DE PLANO
CREATE TABLE IF NOT EXISTS public.billing_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  current_plan_id uuid REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  requested_plan_id uuid REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  requested_addon_id uuid REFERENCES public.billing_addons(id) ON DELETE SET NULL,
  requested_by uuid,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  admin_notes text,
  contact_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT bcr_type_check CHECK (request_type = ANY (ARRAY['upgrade','downgrade','addon','cancel','enterprise_contact'])),
  CONSTRAINT bcr_status_check CHECK (status = ANY (ARRAY['pending','approved','rejected','completed','cancelled']))
);

CREATE INDEX IF NOT EXISTS idx_bcr_ws_status ON public.billing_change_requests(workspace_id, status);

-- 6. ESTENDER workspace_subscriptions
ALTER TABLE public.workspace_subscriptions
  ADD COLUMN IF NOT EXISTS billing_plan_id uuid REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS seats_included integer,
  ADD COLUMN IF NOT EXISTS seats_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_limits jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_price numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR';

CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_billing_plan ON public.workspace_subscriptions(billing_plan_id);

-- 7. TRIGGERS updated_at
CREATE OR REPLACE FUNCTION public.tg_billing_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_billing_plans_touch BEFORE UPDATE ON public.billing_plans
    FOR EACH ROW EXECUTE FUNCTION public.tg_billing_touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_billing_plan_features_touch BEFORE UPDATE ON public.billing_plan_features
    FOR EACH ROW EXECUTE FUNCTION public.tg_billing_touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_billing_addons_touch BEFORE UPDATE ON public.billing_addons
    FOR EACH ROW EXECUTE FUNCTION public.tg_billing_touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_workspace_addons_touch BEFORE UPDATE ON public.workspace_addons
    FOR EACH ROW EXECUTE FUNCTION public.tg_billing_touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_bcr_touch BEFORE UPDATE ON public.billing_change_requests
    FOR EACH ROW EXECUTE FUNCTION public.tg_billing_touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. SYNC PLANO -> COST GUARD LIMITS
CREATE OR REPLACE FUNCTION public.sync_plan_limits_to_workspace(p_workspace_id uuid, p_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f record;
  v_plan_code text;
BEGIN
  SELECT code INTO v_plan_code FROM public.billing_plans WHERE id = p_plan_id;
  IF v_plan_code IS NULL THEN RETURN; END IF;

  -- Cada feature com limit_value vira um cost_guard_limits row
  FOR f IN
    SELECT feature_key, feature_name, limit_value, limit_unit, category, metadata
    FROM public.billing_plan_features
    WHERE plan_id = p_plan_id AND included = true AND limit_value IS NOT NULL
  LOOP
    INSERT INTO public.cost_guard_limits (
      workspace_id, source_module, usage_type, limit_period,
      included_quantity, hard_limit_quantity, soft_limit_percentage,
      block_when_exceeded, notify_when_soft_limit, notify_when_hard_limit, active
    ) VALUES (
      p_workspace_id,
      COALESCE(f.category, 'plan'),
      f.feature_key,
      'monthly',
      f.limit_value,
      f.limit_value,
      80,
      false,
      true,
      true,
      true
    )
    ON CONFLICT (workspace_id, usage_type, limit_period)
    DO UPDATE SET
      included_quantity = EXCLUDED.included_quantity,
      hard_limit_quantity = EXCLUDED.hard_limit_quantity,
      source_module = EXCLUDED.source_module,
      active = true,
      updated_at = now()
    WHERE cost_guard_limits.workspace_id = p_workspace_id
      AND COALESCE((SELECT custom_limits->>f.feature_key FROM public.workspace_subscriptions WHERE workspace_id = p_workspace_id LIMIT 1), '') = '';
  END LOOP;
END;
$$;

-- Trigger: quando plano muda na subscrição, sincroniza limites
CREATE OR REPLACE FUNCTION public.tg_billing_sub_sync_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.billing_plan_id IS NOT NULL AND
     (TG_OP = 'INSERT' OR NEW.billing_plan_id IS DISTINCT FROM OLD.billing_plan_id) THEN
    PERFORM public.sync_plan_limits_to_workspace(NEW.workspace_id, NEW.billing_plan_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_billing_sub_sync_limits ON public.workspace_subscriptions;
CREATE TRIGGER trg_billing_sub_sync_limits
  AFTER INSERT OR UPDATE OF billing_plan_id ON public.workspace_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_billing_sub_sync_limits();

-- 9. RLS
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_change_requests ENABLE ROW LEVEL SECURITY;

-- billing_plans: ver públicos+activos; super admin gere tudo
DROP POLICY IF EXISTS bp_select_public ON public.billing_plans;
CREATE POLICY bp_select_public ON public.billing_plans FOR SELECT
  USING (is_active OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS bp_admin_write ON public.billing_plans;
CREATE POLICY bp_admin_write ON public.billing_plans FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- billing_plan_features
DROP POLICY IF EXISTS bpf_select ON public.billing_plan_features;
CREATE POLICY bpf_select ON public.billing_plan_features FOR SELECT USING (true);

DROP POLICY IF EXISTS bpf_admin_write ON public.billing_plan_features;
CREATE POLICY bpf_admin_write ON public.billing_plan_features FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- billing_addons
DROP POLICY IF EXISTS ba_select ON public.billing_addons;
CREATE POLICY ba_select ON public.billing_addons FOR SELECT
  USING (is_active OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS ba_admin_write ON public.billing_addons;
CREATE POLICY ba_admin_write ON public.billing_addons FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- workspace_addons
DROP POLICY IF EXISTS wa_select ON public.workspace_addons;
CREATE POLICY wa_select ON public.workspace_addons FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS wa_admin_write ON public.workspace_addons;
CREATE POLICY wa_admin_write ON public.workspace_addons FOR ALL
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- billing_change_requests
DROP POLICY IF EXISTS bcr_select ON public.billing_change_requests;
CREATE POLICY bcr_select ON public.billing_change_requests FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS bcr_insert ON public.billing_change_requests;
CREATE POLICY bcr_insert ON public.billing_change_requests FOR INSERT
  WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS bcr_update_admin ON public.billing_change_requests;
CREATE POLICY bcr_update_admin ON public.billing_change_requests FOR UPDATE
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 10. SEED CATÁLOGO BASE
INSERT INTO public.billing_plans (code, name, description, public_description, audience, promise, monthly_price, annual_price, sort_order, recommended, enterprise, is_public, is_active)
VALUES
  ('free',       'Gratuito',   'Experimentação controlada do FastCRM Communication.', 'Para experimentar o WhatsApp Inbox e funcionalidades base.', 'Profissionais a experimentar', 'Centralize o seu WhatsApp num único sítio.', 0, 0, 10, false, false, true, true),
  ('starter',    'Starter',    'Pequenos negócios e profissionais.',                  'WhatsApp Pro, produtos, templates e follow-ups simples.',    'Pequenos negócios', 'Centralize WhatsApp, produtos e follow-ups.', 29, 290, 20, false, false, true, true),
  ('growth',     'Growth',     'Equipas comerciais e suporte em crescimento.',         'Inbox multiagente, Inteligência, agendamentos e tickets.', 'Equipas comerciais e suporte', 'Transforme WhatsApp numa operação de vendas e suporte.', 79, 790, 30, true, false, true, true),
  ('pro',        'Pro',        'Operação profissional com IA e performance.',         'Tudo do Growth + Coaching AI, Workflows avançados, multi-provider.', 'Equipas profissionais', 'Operação completa com IA, suporte e automação.', 199, 1990, 40, false, false, true, true),
  ('enterprise', 'Enterprise', 'Empresas, multi-equipa e integrações personalizadas.', 'Limites personalizados, SLA, multi-provider e integrações.', 'Empresas e multi-equipa', 'Escala internacional com SLA e integrações personalizadas.', NULL, NULL, 50, false, true, true, true)
ON CONFLICT (code) DO NOTHING;

-- 11. SEED FEATURES POR PLANO
WITH plan AS (SELECT id, code FROM public.billing_plans)
INSERT INTO public.billing_plan_features (plan_id, feature_key, feature_name, included, limit_value, limit_unit, category, sort_order)
SELECT p.id, f.feature_key, f.feature_name, f.included, f.limit_value, f.limit_unit, f.category, f.sort_order
FROM plan p
CROSS JOIN LATERAL (VALUES
  -- FREE
  ('free','agents_seats','Agentes',true,1,'seats','team',10),
  ('free','whatsapp_provider_instances','Instâncias WhatsApp',true,1,'instances','whatsapp',20),
  ('free','whatsapp_messages_monthly','Mensagens WhatsApp/mês',true,100,'messages','whatsapp',30),
  ('free','ai_conversation_analysis','Análises IA',true,20,'analyses','ai',40),
  ('free','ai_audio_transcription_minutes','Minutos transcrição',true,10,'minutes','ai',50),
  ('free','automation_runs_monthly','Execuções de automação',true,100,'runs','automation',60),
  ('free','support_tickets','Tickets de suporte',true,25,'tickets','support',70),
  ('free','storage_media_mb','Armazenamento média',true,100,'mb','storage',80),
  ('free','quality_reviews','Quality Reviews',false,0,'reviews','ai',90),
  ('free','team_inbox','Team Inbox',false,NULL,NULL,'team',100),
  ('free','ai_coaching','Coaching AI',false,NULL,NULL,'ai',110),
  -- STARTER
  ('starter','agents_seats','Agentes',true,3,'seats','team',10),
  ('starter','whatsapp_provider_instances','Instâncias WhatsApp',true,1,'instances','whatsapp',20),
  ('starter','whatsapp_messages_monthly','Mensagens WhatsApp/mês',true,1000,'messages','whatsapp',30),
  ('starter','whatsapp_product_sharing','Envio de produtos',true,NULL,NULL,'whatsapp',35),
  ('starter','ai_conversation_analysis','Análises IA',true,200,'analyses','ai',40),
  ('starter','ai_audio_transcription_minutes','Minutos transcrição',true,60,'minutes','ai',50),
  ('starter','automation_runs_monthly','Execuções de automação',true,1000,'runs','automation',60),
  ('starter','support_tickets','Tickets de suporte',true,250,'tickets','support',70),
  ('starter','storage_media_mb','Armazenamento média',true,1000,'mb','storage',80),
  ('starter','quality_reviews','Quality Reviews',true,25,'reviews','ai',90),
  ('starter','team_inbox','Team Inbox',false,NULL,NULL,'team',100),
  ('starter','ai_coaching','Coaching AI',false,NULL,NULL,'ai',110),
  -- GROWTH
  ('growth','agents_seats','Agentes',true,10,'seats','team',10),
  ('growth','whatsapp_provider_instances','Instâncias WhatsApp',true,2,'instances','whatsapp',20),
  ('growth','whatsapp_messages_monthly','Mensagens WhatsApp/mês',true,5000,'messages','whatsapp',30),
  ('growth','ai_conversation_analysis','Análises IA',true,1000,'analyses','ai',40),
  ('growth','ai_audio_transcription_minutes','Minutos transcrição',true,300,'minutes','ai',50),
  ('growth','automation_runs_monthly','Execuções de automação',true,5000,'runs','automation',60),
  ('growth','support_tickets','Tickets de suporte',true,2000,'tickets','support',70),
  ('growth','storage_media_mb','Armazenamento média',true,10000,'mb','storage',80),
  ('growth','quality_reviews','Quality Reviews',true,250,'reviews','ai',90),
  ('growth','team_inbox','Team Inbox',true,NULL,NULL,'team',100),
  ('growth','ai_coaching','Coaching AI',false,NULL,NULL,'ai',110),
  ('growth','support_sla','Suporte SLA básico',true,NULL,NULL,'support',120),
  -- PRO
  ('pro','agents_seats','Agentes',true,25,'seats','team',10),
  ('pro','whatsapp_provider_instances','Instâncias WhatsApp',true,5,'instances','whatsapp',20),
  ('pro','whatsapp_messages_monthly','Mensagens WhatsApp/mês',true,20000,'messages','whatsapp',30),
  ('pro','ai_conversation_analysis','Análises IA',true,5000,'analyses','ai',40),
  ('pro','ai_audio_transcription_minutes','Minutos transcrição',true,1000,'minutes','ai',50),
  ('pro','automation_runs_monthly','Execuções de automação',true,25000,'runs','automation',60),
  ('pro','support_tickets','Tickets de suporte',true,10000,'tickets','support',70),
  ('pro','storage_media_mb','Armazenamento média',true,50000,'mb','storage',80),
  ('pro','quality_reviews','Quality Reviews',true,1000,'reviews','ai',90),
  ('pro','team_inbox','Team Inbox',true,NULL,NULL,'team',100),
  ('pro','ai_coaching','Coaching AI',true,NULL,NULL,'ai',110),
  ('pro','support_sla','Suporte SLA avançado',true,NULL,NULL,'support',120),
  ('pro','smart_workflows','Smart Workflows avançados',true,NULL,NULL,'automation',130),
  ('pro','multi_provider','Multi-provider',true,NULL,NULL,'enterprise',140),
  -- ENTERPRISE
  ('enterprise','agents_seats','Agentes',true,NULL,'custom','team',10),
  ('enterprise','whatsapp_messages_monthly','Mensagens WhatsApp/mês',true,NULL,'custom','whatsapp',30),
  ('enterprise','ai_conversation_analysis','Análises IA',true,NULL,'custom','ai',40),
  ('enterprise','quality_reviews','Quality Reviews',true,NULL,'custom','ai',90),
  ('enterprise','team_inbox','Team Inbox',true,NULL,NULL,'team',100),
  ('enterprise','ai_coaching','Coaching AI',true,NULL,NULL,'ai',110),
  ('enterprise','support_sla','SLA personalizado',true,NULL,NULL,'support',120),
  ('enterprise','smart_workflows','Smart Workflows avançados',true,NULL,NULL,'automation',130),
  ('enterprise','multi_provider','Multi-provider',true,NULL,NULL,'enterprise',140),
  ('enterprise','custom_limits','Limites personalizados',true,NULL,NULL,'enterprise',150),
  ('enterprise','audit_logs','Audit logs',true,NULL,NULL,'enterprise',160),
  ('enterprise','integrations','Integrações personalizadas',true,NULL,NULL,'enterprise',170)
) AS f(plan_code, feature_key, feature_name, included, limit_value, limit_unit, category, sort_order)
WHERE p.code = f.plan_code
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- 12. SEED ADD-ONS BASE
INSERT INTO public.billing_addons (code, name, description, category, unit_name, price_per_unit) VALUES
  ('addon_msgs_1k',       'Mensagens WhatsApp +1.000',     'Pacote de 1.000 mensagens adicionais.', 'whatsapp',  '1k mensagens',   12),
  ('addon_transcript_100','Transcrição +100 minutos',      'Pacote de 100 minutos de transcrição.', 'ai',        '100 minutos',     9),
  ('addon_ai_1k',         'Análises IA +1.000',            'Pacote de 1.000 análises adicionais.',  'ai',        '1k análises',    19),
  ('addon_seats_5',       'Agentes +5',                    '5 agentes adicionais.',                 'seats',     '5 seats',        25),
  ('addon_storage_10gb',  'Armazenamento +10 GB',          '10 GB de armazenamento adicional.',     'storage',   '10 GB',           5),
  ('addon_runs_10k',      'Automation runs +10.000',       '10.000 execuções adicionais.',          'usage',     '10k runs',       15),
  ('addon_sla_premium',   'Suporte SLA Premium',           'Resposta prioritária e SLA dedicado.',  'support',   'mês',            49),
  ('addon_multiprovider', 'Multi-provider Pack',           'Suporte a múltiplos providers WhatsApp.','whatsapp', 'mês',            29)
ON CONFLICT (code) DO NOTHING;