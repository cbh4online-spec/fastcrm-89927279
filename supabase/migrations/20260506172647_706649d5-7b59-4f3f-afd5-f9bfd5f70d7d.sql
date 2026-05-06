-- =====================================================
-- FASE 1K — COST GUARD
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cost_guard_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  plan_name text NOT NULL CHECK (plan_name IN ('free','starter','growth','pro','enterprise','custom')),
  billing_currency text NOT NULL DEFAULT 'EUR',
  monthly_base_price numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cgp_ws_active ON public.cost_guard_plans(workspace_id, active);

CREATE TABLE IF NOT EXISTS public.cost_guard_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NULL,
  provider_name text NOT NULL,
  source_module text NOT NULL,
  usage_type text NOT NULL,
  country text NULL,
  currency text NOT NULL DEFAULT 'EUR',
  cost_unit_amount numeric NOT NULL DEFAULT 0,
  billable_unit_amount numeric NULL,
  unit text NOT NULL DEFAULT 'event',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date NULL,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cgr_lookup ON public.cost_guard_rates(usage_type, provider_name, country, active);

CREATE TABLE IF NOT EXISTS public.cost_guard_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  plan_id uuid NULL REFERENCES public.cost_guard_plans(id) ON DELETE SET NULL,
  source_module text NOT NULL,
  usage_type text NOT NULL,
  limit_period text NOT NULL DEFAULT 'monthly' CHECK (limit_period IN ('daily','weekly','monthly')),
  included_quantity numeric NULL,
  hard_limit_quantity numeric NULL,
  soft_limit_percentage numeric NOT NULL DEFAULT 80,
  block_when_exceeded boolean NOT NULL DEFAULT false,
  notify_when_soft_limit boolean NOT NULL DEFAULT true,
  notify_when_hard_limit boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, usage_type, limit_period)
);
CREATE INDEX IF NOT EXISTS idx_cgl_ws ON public.cost_guard_limits(workspace_id, active);

CREATE TABLE IF NOT EXISTS public.cost_guard_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NULL,
  provider_instance_id uuid NULL,
  provider_name text NULL,
  source_module text NOT NULL,
  usage_type text NOT NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'event',
  country text NULL,
  currency text NOT NULL DEFAULT 'EUR',
  cost_unit_amount numeric NULL,
  cost_total_amount numeric NULL,
  billable_unit_amount numeric NULL,
  billable_total_amount numeric NULL,
  margin_amount numeric NULL,
  margin_percentage numeric NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cge_ws_time ON public.cost_guard_events(workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cge_ws_type ON public.cost_guard_events(workspace_id, usage_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cge_module ON public.cost_guard_events(workspace_id, source_module, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.cost_guard_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  date date NOT NULL,
  source_module text NOT NULL,
  usage_type text NOT NULL,
  quantity_total numeric NOT NULL DEFAULT 0,
  cost_total_amount numeric NOT NULL DEFAULT 0,
  billable_total_amount numeric NOT NULL DEFAULT 0,
  margin_total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, date, usage_type)
);
CREATE INDEX IF NOT EXISTS idx_cgd_ws_date ON public.cost_guard_daily(workspace_id, date DESC);

CREATE TABLE IF NOT EXISTS public.cost_guard_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  month text NOT NULL,
  source_module text NOT NULL,
  usage_type text NOT NULL,
  quantity_total numeric NOT NULL DEFAULT 0,
  cost_total_amount numeric NOT NULL DEFAULT 0,
  billable_total_amount numeric NOT NULL DEFAULT 0,
  margin_total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, month, usage_type)
);
CREATE INDEX IF NOT EXISTS idx_cgm_ws_month ON public.cost_guard_monthly(workspace_id, month DESC);

CREATE TABLE IF NOT EXISTS public.cost_guard_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  limit_id uuid NULL REFERENCES public.cost_guard_limits(id) ON DELETE SET NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('soft_limit','hard_limit','anomaly','cost_spike','provider_error_spike')),
  source_module text NULL,
  usage_type text NULL,
  threshold_value numeric NULL,
  current_value numeric NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  title text NOT NULL,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_cga_ws_status ON public.cost_guard_alerts(workspace_id, status, created_at DESC);

-- TRIGGERS updated_at
CREATE TRIGGER trg_cgp_updated BEFORE UPDATE ON public.cost_guard_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cgr_updated BEFORE UPDATE ON public.cost_guard_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cgl_updated BEFORE UPDATE ON public.cost_guard_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cgd_updated BEFORE UPDATE ON public.cost_guard_daily FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cgm_updated BEFORE UPDATE ON public.cost_guard_monthly FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AGGREGATE TRIGGER
CREATE OR REPLACE FUNCTION public.fn_cost_guard_aggregate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_date date := (NEW.occurred_at AT TIME ZONE 'UTC')::date;
  v_month text := to_char(NEW.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM');
  v_limit RECORD; v_current numeric; v_period_start timestamptz; v_pct numeric;
BEGIN
  INSERT INTO public.cost_guard_daily (workspace_id, date, source_module, usage_type, quantity_total, cost_total_amount, billable_total_amount, margin_total_amount, currency)
  VALUES (NEW.workspace_id, v_date, NEW.source_module, NEW.usage_type, NEW.quantity, COALESCE(NEW.cost_total_amount,0), COALESCE(NEW.billable_total_amount,0), COALESCE(NEW.margin_amount,0), NEW.currency)
  ON CONFLICT (workspace_id, date, usage_type) DO UPDATE SET
    quantity_total = cost_guard_daily.quantity_total + EXCLUDED.quantity_total,
    cost_total_amount = cost_guard_daily.cost_total_amount + EXCLUDED.cost_total_amount,
    billable_total_amount = cost_guard_daily.billable_total_amount + EXCLUDED.billable_total_amount,
    margin_total_amount = cost_guard_daily.margin_total_amount + EXCLUDED.margin_total_amount,
    updated_at = now();

  INSERT INTO public.cost_guard_monthly (workspace_id, month, source_module, usage_type, quantity_total, cost_total_amount, billable_total_amount, margin_total_amount, currency)
  VALUES (NEW.workspace_id, v_month, NEW.source_module, NEW.usage_type, NEW.quantity, COALESCE(NEW.cost_total_amount,0), COALESCE(NEW.billable_total_amount,0), COALESCE(NEW.margin_amount,0), NEW.currency)
  ON CONFLICT (workspace_id, month, usage_type) DO UPDATE SET
    quantity_total = cost_guard_monthly.quantity_total + EXCLUDED.quantity_total,
    cost_total_amount = cost_guard_monthly.cost_total_amount + EXCLUDED.cost_total_amount,
    billable_total_amount = cost_guard_monthly.billable_total_amount + EXCLUDED.billable_total_amount,
    margin_total_amount = cost_guard_monthly.margin_total_amount + EXCLUDED.margin_total_amount,
    updated_at = now();

  FOR v_limit IN SELECT * FROM public.cost_guard_limits WHERE workspace_id = NEW.workspace_id AND usage_type = NEW.usage_type AND active = true LOOP
    v_period_start := CASE v_limit.limit_period WHEN 'daily' THEN date_trunc('day', now()) WHEN 'weekly' THEN date_trunc('week', now()) ELSE date_trunc('month', now()) END;
    SELECT COALESCE(SUM(quantity),0) INTO v_current FROM public.cost_guard_events WHERE workspace_id = NEW.workspace_id AND usage_type = NEW.usage_type AND occurred_at >= v_period_start;

    IF v_limit.hard_limit_quantity IS NOT NULL AND v_limit.hard_limit_quantity > 0 THEN
      v_pct := (v_current / v_limit.hard_limit_quantity) * 100;
      IF v_pct >= 100 AND v_limit.notify_when_hard_limit THEN
        IF NOT EXISTS (SELECT 1 FROM public.cost_guard_alerts WHERE workspace_id=NEW.workspace_id AND limit_id=v_limit.id AND alert_type='hard_limit' AND status='open' AND created_at>=v_period_start) THEN
          INSERT INTO public.cost_guard_alerts(workspace_id,limit_id,alert_type,source_module,usage_type,threshold_value,current_value,severity,title,description)
          VALUES (NEW.workspace_id, v_limit.id, 'hard_limit', NEW.source_module, NEW.usage_type, v_limit.hard_limit_quantity, v_current, 'critical',
                  'Limite máximo atingido: ' || NEW.usage_type, 'O limite de ' || v_limit.hard_limit_quantity || ' (' || v_limit.limit_period || ') foi atingido.');
        END IF;
      ELSIF v_pct >= v_limit.soft_limit_percentage AND v_limit.notify_when_soft_limit THEN
        IF NOT EXISTS (SELECT 1 FROM public.cost_guard_alerts WHERE workspace_id=NEW.workspace_id AND limit_id=v_limit.id AND alert_type='soft_limit' AND status='open' AND created_at>=v_period_start) THEN
          INSERT INTO public.cost_guard_alerts(workspace_id,limit_id,alert_type,source_module,usage_type,threshold_value,current_value,severity,title,description)
          VALUES (NEW.workspace_id, v_limit.id, 'soft_limit', NEW.source_module, NEW.usage_type, v_limit.hard_limit_quantity, v_current, 'warning',
                  'Aviso de consumo: ' || NEW.usage_type, 'Consumo atingiu ' || round(v_pct,1) || '% do limite (' || v_current || '/' || v_limit.hard_limit_quantity || ').');
        END IF;
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_cge_aggregate AFTER INSERT ON public.cost_guard_events FOR EACH ROW EXECUTE FUNCTION public.fn_cost_guard_aggregate();

-- RPCs
CREATE OR REPLACE FUNCTION public.cost_guard_record_event(
  p_workspace_id uuid, p_source_module text, p_usage_type text,
  p_quantity numeric DEFAULT 1, p_unit text DEFAULT 'event',
  p_provider_name text DEFAULT NULL, p_provider_instance_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL, p_entity_type text DEFAULT NULL, p_entity_id uuid DEFAULT NULL,
  p_country text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rate RECORD; v_cost_unit numeric := 0; v_billable_unit numeric := 0;
  v_cost_total numeric; v_billable_total numeric; v_margin numeric; v_margin_pct numeric;
  v_currency text := 'EUR'; v_event_id uuid;
BEGIN
  SELECT * INTO v_rate FROM public.cost_guard_rates
  WHERE active=true AND usage_type=p_usage_type
    AND (provider_name=p_provider_name OR p_provider_name IS NULL OR provider_name IS NULL)
    AND (country=p_country OR country IS NULL OR p_country IS NULL)
    AND (workspace_id=p_workspace_id OR workspace_id IS NULL)
    AND effective_from <= CURRENT_DATE
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  ORDER BY (workspace_id IS NOT NULL) DESC, (provider_name IS NOT NULL) DESC, (country IS NOT NULL) DESC, effective_from DESC
  LIMIT 1;

  IF FOUND THEN
    v_cost_unit := COALESCE(v_rate.cost_unit_amount, 0);
    v_billable_unit := COALESCE(v_rate.billable_unit_amount, v_cost_unit);
    v_currency := v_rate.currency;
  END IF;

  v_cost_total := v_cost_unit * p_quantity;
  v_billable_total := v_billable_unit * p_quantity;
  v_margin := v_billable_total - v_cost_total;
  v_margin_pct := CASE WHEN v_billable_total > 0 THEN (v_margin / v_billable_total) * 100 ELSE 0 END;

  INSERT INTO public.cost_guard_events (
    workspace_id,user_id,provider_instance_id,provider_name,source_module,usage_type,
    entity_type,entity_id,quantity,unit,country,currency,
    cost_unit_amount,cost_total_amount,billable_unit_amount,billable_total_amount,
    margin_amount,margin_percentage,metadata
  ) VALUES (
    p_workspace_id,p_user_id,p_provider_instance_id,p_provider_name,p_source_module,p_usage_type,
    p_entity_type,p_entity_id,p_quantity,p_unit,p_country,v_currency,
    v_cost_unit,v_cost_total,v_billable_unit,v_billable_total,v_margin,v_margin_pct,p_metadata
  ) RETURNING id INTO v_event_id;
  RETURN v_event_id;
END; $$;

CREATE OR REPLACE FUNCTION public.cost_guard_check_limit(
  p_workspace_id uuid, p_usage_type text, p_quantity numeric DEFAULT 1
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_limit RECORD; v_current numeric := 0; v_period_start timestamptz; v_after numeric; v_pct numeric;
BEGIN
  SELECT * INTO v_limit FROM public.cost_guard_limits WHERE workspace_id=p_workspace_id AND usage_type=p_usage_type AND active=true ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND OR v_limit.hard_limit_quantity IS NULL THEN
    RETURN jsonb_build_object('allowed',true,'reason',null,'current_usage',0,'limit',null,'percentage',0,'warning',false,'blocked',false);
  END IF;
  v_period_start := CASE v_limit.limit_period WHEN 'daily' THEN date_trunc('day', now()) WHEN 'weekly' THEN date_trunc('week', now()) ELSE date_trunc('month', now()) END;
  SELECT COALESCE(SUM(quantity),0) INTO v_current FROM public.cost_guard_events WHERE workspace_id=p_workspace_id AND usage_type=p_usage_type AND occurred_at >= v_period_start;
  v_after := v_current + p_quantity;
  v_pct := (v_after / v_limit.hard_limit_quantity) * 100;
  RETURN jsonb_build_object(
    'allowed', NOT (v_after > v_limit.hard_limit_quantity AND v_limit.block_when_exceeded),
    'reason', CASE WHEN v_after > v_limit.hard_limit_quantity AND v_limit.block_when_exceeded THEN 'hard_limit_exceeded'
                   WHEN v_after > v_limit.hard_limit_quantity THEN 'overage'
                   WHEN v_pct >= v_limit.soft_limit_percentage THEN 'soft_limit_warning' ELSE null END,
    'current_usage', v_current, 'limit', v_limit.hard_limit_quantity, 'percentage', round(v_pct, 2),
    'warning', v_pct >= v_limit.soft_limit_percentage,
    'blocked', v_after > v_limit.hard_limit_quantity AND v_limit.block_when_exceeded,
    'period', v_limit.limit_period
  );
END; $$;

-- RLS
ALTER TABLE public.cost_guard_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_guard_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_guard_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_guard_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_guard_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_guard_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_guard_alerts ENABLE ROW LEVEL SECURITY;

-- usar funções existentes is_workspace_admin_or_owner(_user_id, _workspace_id) e is_super_admin(uuid)
CREATE POLICY "cgp_select" ON public.cost_guard_plans FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = cost_guard_plans.workspace_id AND wm.user_id = auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "cgp_admin_write" ON public.cost_guard_plans FOR ALL
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "cgr_admin_select" ON public.cost_guard_rates FOR SELECT
  USING ((workspace_id IS NOT NULL AND public.is_workspace_admin_or_owner(auth.uid(), workspace_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "cgr_admin_write" ON public.cost_guard_rates FOR ALL
  USING ((workspace_id IS NOT NULL AND public.is_workspace_admin_or_owner(auth.uid(), workspace_id)) OR public.is_super_admin(auth.uid()))
  WITH CHECK ((workspace_id IS NOT NULL AND public.is_workspace_admin_or_owner(auth.uid(), workspace_id)) OR public.is_super_admin(auth.uid()));

CREATE POLICY "cgl_member_select" ON public.cost_guard_limits FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = cost_guard_limits.workspace_id AND wm.user_id = auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "cgl_admin_write" ON public.cost_guard_limits FOR ALL
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "cge_member_select" ON public.cost_guard_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = cost_guard_events.workspace_id AND wm.user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "cgd_member_select" ON public.cost_guard_daily FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = cost_guard_daily.workspace_id AND wm.user_id = auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "cgm_member_select" ON public.cost_guard_monthly FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = cost_guard_monthly.workspace_id AND wm.user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "cga_member_select" ON public.cost_guard_alerts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = cost_guard_alerts.workspace_id AND wm.user_id = auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "cga_admin_update" ON public.cost_guard_alerts FOR UPDATE
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
