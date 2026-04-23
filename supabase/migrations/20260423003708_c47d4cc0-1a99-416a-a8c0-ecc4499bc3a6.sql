-- =========================================================================
-- 1. CATÁLOGO DE METAS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.activation_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_key text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('setup_base','primeiros_dados','comunicacao_automacao','comercio_checkout')),
  title text NOT NULL,
  description text,
  cta_label text,
  cta_route text,
  weight integer NOT NULL DEFAULT 1,
  display_order integer NOT NULL DEFAULT 0,
  detection_type text NOT NULL DEFAULT 'manual' CHECK (detection_type IN ('manual','auto')),
  detection_query text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activation_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view activation goals"
  ON public.activation_goals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins manage activation goals"
  ON public.activation_goals FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- =========================================================================
-- 2. PROGRESSO POR WORKSPACE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.workspace_activation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  goal_key text NOT NULL REFERENCES public.activation_goals(goal_key) ON DELETE CASCADE,
  completed_at timestamptz,
  completed_by uuid,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto','admin')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, goal_key)
);

CREATE INDEX IF NOT EXISTS idx_wap_workspace ON public.workspace_activation_progress(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wap_completed ON public.workspace_activation_progress(workspace_id) WHERE completed_at IS NOT NULL;

ALTER TABLE public.workspace_activation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view workspace activation progress"
  ON public.workspace_activation_progress FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members upsert workspace activation progress"
  ON public.workspace_activation_progress FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members update workspace activation progress"
  ON public.workspace_activation_progress FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- =========================================================================
-- 3. ESTADO DO ONBOARDING UI (wizard + widget)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.workspace_onboarding_state (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  wizard_step integer NOT NULL DEFAULT 0,
  wizard_completed_at timestamptz,
  wizard_skipped boolean NOT NULL DEFAULT false,
  widget_dismissed boolean NOT NULL DEFAULT false,
  widget_minimized boolean NOT NULL DEFAULT false,
  first_login_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view onboarding state"
  ON public.workspace_onboarding_state FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members insert onboarding state"
  ON public.workspace_onboarding_state FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members update onboarding state"
  ON public.workspace_onboarding_state FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- =========================================================================
-- 4. SNAPSHOTS DIÁRIOS PARA COHORTS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.workspace_activation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT current_date,
  score numeric(5,2) NOT NULL DEFAULT 0,
  goals_completed integer NOT NULL DEFAULT 0,
  goals_total integer NOT NULL DEFAULT 0,
  category_breakdown jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_was_workspace_date ON public.workspace_activation_snapshots(workspace_id, snapshot_date DESC);

ALTER TABLE public.workspace_activation_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view activation snapshots"
  ON public.workspace_activation_snapshots FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage snapshots"
  ON public.workspace_activation_snapshots FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- =========================================================================
-- 5. FUNÇÕES
-- =========================================================================
CREATE OR REPLACE FUNCTION public.compute_workspace_activation_score(_workspace_id uuid)
RETURNS TABLE (score numeric, goals_completed integer, goals_total integer, category_breakdown jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_weight numeric := 0;
  done_weight numeric := 0;
  total_count integer := 0;
  done_count integer := 0;
  breakdown jsonb := '{}'::jsonb;
BEGIN
  SELECT COALESCE(SUM(weight),0), COUNT(*)
    INTO total_weight, total_count
  FROM public.activation_goals WHERE is_active = true;

  SELECT COALESCE(SUM(g.weight),0), COUNT(*)
    INTO done_weight, done_count
  FROM public.workspace_activation_progress p
  JOIN public.activation_goals g ON g.goal_key = p.goal_key AND g.is_active = true
  WHERE p.workspace_id = _workspace_id AND p.completed_at IS NOT NULL;

  SELECT jsonb_object_agg(category, jsonb_build_object(
    'completed', completed,
    'total', total
  ))
    INTO breakdown
  FROM (
    SELECT g.category,
      COUNT(*) FILTER (WHERE p.completed_at IS NOT NULL) AS completed,
      COUNT(*) AS total
    FROM public.activation_goals g
    LEFT JOIN public.workspace_activation_progress p
      ON p.goal_key = g.goal_key AND p.workspace_id = _workspace_id
    WHERE g.is_active = true
    GROUP BY g.category
  ) t;

  RETURN QUERY SELECT
    CASE WHEN total_weight > 0 THEN ROUND((done_weight / total_weight) * 100, 2) ELSE 0 END,
    done_count,
    total_count,
    COALESCE(breakdown, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_activation_goal(_workspace_id uuid, _goal_key text, _source text DEFAULT 'manual')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_workspace_member(auth.uid(), _workspace_id) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.workspace_activation_progress (workspace_id, goal_key, completed_at, completed_by, source)
  VALUES (_workspace_id, _goal_key, now(), auth.uid(), _source)
  ON CONFLICT (workspace_id, goal_key) DO UPDATE
    SET completed_at = COALESCE(public.workspace_activation_progress.completed_at, EXCLUDED.completed_at),
        completed_by = COALESCE(public.workspace_activation_progress.completed_by, EXCLUDED.completed_by),
        source = EXCLUDED.source,
        updated_at = now();
END;
$$;

-- =========================================================================
-- 6. VIEW PARA ADMIN
-- =========================================================================
CREATE OR REPLACE VIEW public.workspace_activation_overview
WITH (security_invoker = true)
AS
SELECT
  w.id AS workspace_id,
  w.name AS workspace_name,
  w.created_at AS workspace_created_at,
  EXTRACT(DAY FROM (now() - w.created_at))::integer AS days_since_signup,
  COALESCE(s.score, 0) AS activation_score,
  COALESCE(s.goals_completed, 0) AS goals_completed,
  COALESCE(s.goals_total, 0) AS goals_total,
  COALESCE(s.category_breakdown, '{}'::jsonb) AS category_breakdown,
  CASE
    WHEN EXTRACT(DAY FROM (now() - w.created_at)) >= 7 AND COALESCE(s.score,0) < 30 THEN 'churn_risk'
    WHEN COALESCE(s.score,0) >= 80 THEN 'activated'
    WHEN COALESCE(s.score,0) >= 40 THEN 'engaged'
    ELSE 'onboarding'
  END AS activation_status,
  os.wizard_completed_at,
  os.wizard_skipped,
  os.first_login_at
FROM public.workspaces w
LEFT JOIN LATERAL (
  SELECT * FROM public.compute_workspace_activation_score(w.id)
) s ON true
LEFT JOIN public.workspace_onboarding_state os ON os.workspace_id = w.id;

-- =========================================================================
-- 7. TRIGGER updated_at
-- =========================================================================
CREATE TRIGGER trg_activation_goals_updated BEFORE UPDATE ON public.activation_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_wap_updated BEFORE UPDATE ON public.workspace_activation_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_wos_updated BEFORE UPDATE ON public.workspace_onboarding_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 8. SEED DE METAS (12 metas em 4 categorias)
-- =========================================================================
INSERT INTO public.activation_goals (goal_key, category, title, description, cta_label, cta_route, weight, display_order, detection_type) VALUES
  ('business_context','setup_base','Definir contexto do negócio','Conta-nos o que vendes para personalizarmos a tua experiência.','Configurar agora','/dashboard/onboarding/wizard',2,1,'auto'),
  ('create_pipeline','setup_base','Criar o teu pipeline','Define os estágios pelos quais os negócios passam.','Criar pipeline','/dashboard/pipelines',2,2,'auto'),
  ('invite_member','setup_base','Convidar 1 membro da equipa','As vendas crescem em equipa. Convida o teu primeiro colega.','Convidar membro','/dashboard/team',1,3,'auto'),
  ('first_contact','primeiros_dados','Adicionar 5 contactos','Importa do CSV ou cria manualmente.','Adicionar contactos','/dashboard/contacts',2,4,'auto'),
  ('first_company','primeiros_dados','Criar 1 empresa','Associa contactos a empresas para vendas B2B.','Criar empresa','/dashboard/companies',1,5,'auto'),
  ('first_deal','primeiros_dados','Criar 1 negócio','Move o primeiro deal pelo teu pipeline.','Criar negócio','/dashboard/deals',2,6,'auto'),
  ('connect_whatsapp','comunicacao_automacao','Ligar WhatsApp','Conversa com clientes diretamente da plataforma.','Ligar WhatsApp','/dashboard/integrations/whatsapp',2,7,'auto'),
  ('connect_email','comunicacao_automacao','Ligar email','Sincroniza emails com o CRM.','Ligar email','/dashboard/integrations/email',2,8,'auto'),
  ('first_message','comunicacao_automacao','Enviar 1 mensagem','Envia a primeira comunicação a um contacto.','Enviar mensagem','/dashboard/inbox',1,9,'auto'),
  ('activate_ai_sdr','comunicacao_automacao','Ativar AI SDR ou automação','Deixa a IA prospetar e responder por ti.','Ativar AI SDR','/dashboard/ai-sdr',2,10,'auto'),
  ('first_product','comercio_checkout','Criar 1 produto','Adiciona o primeiro produto ao catálogo.','Criar produto','/dashboard/products',1,11,'auto'),
  ('configure_checkout','comercio_checkout','Configurar checkout','Liga o pagamento online para vender 24/7.','Configurar checkout','/dashboard/checkout',2,12,'auto')
ON CONFLICT (goal_key) DO NOTHING;