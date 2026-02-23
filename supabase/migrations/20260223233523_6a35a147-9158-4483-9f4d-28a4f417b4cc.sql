
-- ============================================
-- FASE 3: Motor de Retenção B2B - 12 new tables
-- ============================================

-- BLOCO A: Alertas de Reposição

CREATE TABLE public.client_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  channel_email boolean NOT NULL DEFAULT true,
  channel_whatsapp boolean NOT NULL DEFAULT false,
  frequency text NOT NULL DEFAULT 'monthly',
  opt_in_whatsapp boolean NOT NULL DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, company_id)
);
ALTER TABLE public.client_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notif_settings_company ON public.client_notification_settings(company_id);
CREATE POLICY "notif_settings_select" ON public.client_notification_settings FOR SELECT TO authenticated USING (company_id = public.get_client_company_id(auth.uid()));
CREATE POLICY "notif_settings_all" ON public.client_notification_settings FOR ALL TO authenticated USING (company_id = public.get_client_company_id(auth.uid())) WITH CHECK (company_id = public.get_client_company_id(auth.uid()));

CREATE TABLE public.client_replenishment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  scope text NOT NULL,
  reference_id text NOT NULL,
  reorder_threshold_days integer NOT NULL DEFAULT 30,
  min_qty_suggestion integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_replenishment_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "repl_rules_select" ON public.client_replenishment_rules FOR SELECT TO authenticated USING (company_id = public.get_client_company_id(auth.uid()));
CREATE POLICY "repl_rules_all" ON public.client_replenishment_rules FOR ALL TO authenticated USING (company_id = public.get_client_company_id(auth.uid())) WITH CHECK (company_id = public.get_client_company_id(auth.uid()));

CREATE TABLE public.client_replenishment_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  suggested_items jsonb NOT NULL DEFAULT '[]',
  reason text,
  confidence_score numeric,
  status text NOT NULL DEFAULT 'new',
  sent_at timestamptz,
  converted_order_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_replenishment_suggestions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_repl_suggestions_co ON public.client_replenishment_suggestions(company_id, status);
CREATE POLICY "repl_sugg_select" ON public.client_replenishment_suggestions FOR SELECT TO authenticated USING (company_id = public.get_client_company_id(auth.uid()));
CREATE POLICY "repl_sugg_update" ON public.client_replenishment_suggestions FOR UPDATE TO authenticated USING (company_id = public.get_client_company_id(auth.uid()));

-- BLOCO B: Protocolos Favoritos

CREATE TABLE public.client_favorite_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  protocol_id uuid NOT NULL REFERENCES public.product_protocols(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.client_users(id),
  default_kit_level text NOT NULL DEFAULT 'basic',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, protocol_id)
);
ALTER TABLE public.client_favorite_protocols ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_fav_protocols_co ON public.client_favorite_protocols(company_id);
CREATE POLICY "fav_proto_select" ON public.client_favorite_protocols FOR SELECT TO authenticated USING (company_id = public.get_client_company_id(auth.uid()));
CREATE POLICY "fav_proto_all" ON public.client_favorite_protocols FOR ALL TO authenticated USING (company_id = public.get_client_company_id(auth.uid())) WITH CHECK (company_id = public.get_client_company_id(auth.uid()));

CREATE TABLE public.client_favorite_protocol_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  protocol_id uuid NOT NULL REFERENCES public.product_protocols(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  default_qty integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, protocol_id, product_id)
);
ALTER TABLE public.client_favorite_protocol_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fav_override_select" ON public.client_favorite_protocol_overrides FOR SELECT TO authenticated USING (company_id = public.get_client_company_id(auth.uid()));
CREATE POLICY "fav_override_all" ON public.client_favorite_protocol_overrides FOR ALL TO authenticated USING (company_id = public.get_client_company_id(auth.uid())) WITH CHECK (company_id = public.get_client_company_id(auth.uid()));

-- BLOCO C: Planos Recorrentes

CREATE TABLE public.b2b_subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  name text NOT NULL,
  cadence text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'draft',
  approval_mode text NOT NULL DEFAULT 'approval_required',
  max_cycle_value numeric,
  stripe_subscription_id text,
  next_run_at timestamptz,
  created_by uuid REFERENCES public.client_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_b2b_plans_co ON public.b2b_subscription_plans(company_id, status);
CREATE POLICY "b2b_plans_select" ON public.b2b_subscription_plans FOR SELECT TO authenticated USING (company_id = public.get_client_company_id(auth.uid()));
CREATE POLICY "b2b_plans_all" ON public.b2b_subscription_plans FOR ALL TO authenticated USING (company_id = public.get_client_company_id(auth.uid())) WITH CHECK (company_id = public.get_client_company_id(auth.uid()));

CREATE TABLE public.b2b_subscription_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.b2b_subscription_plans(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty integer NOT NULL DEFAULT 1,
  price_override numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_subscription_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "b2b_items_select" ON public.b2b_subscription_plan_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.b2b_subscription_plans p WHERE p.id = plan_id AND p.company_id = public.get_client_company_id(auth.uid())));
CREATE POLICY "b2b_items_all" ON public.b2b_subscription_plan_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.b2b_subscription_plans p WHERE p.id = plan_id AND p.company_id = public.get_client_company_id(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.b2b_subscription_plans p WHERE p.id = plan_id AND p.company_id = public.get_client_company_id(auth.uid())));

CREATE TABLE public.b2b_subscription_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.b2b_subscription_plans(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft',
  order_id text,
  invoice_id text,
  notes text,
  amount numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_subscription_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_b2b_runs_plan ON public.b2b_subscription_runs(plan_id, status);
CREATE POLICY "b2b_runs_select" ON public.b2b_subscription_runs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.b2b_subscription_plans p WHERE p.id = plan_id AND p.company_id = public.get_client_company_id(auth.uid())));

-- BLOCO D: Stock e Previsão

CREATE TABLE public.product_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stock_on_hand integer NOT NULL DEFAULT 0,
  stock_reserved integer NOT NULL DEFAULT 0,
  reorder_point integer NOT NULL DEFAULT 5,
  supplier_lead_time_days integer NOT NULL DEFAULT 7,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, workspace_id)
);
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_select" ON public.product_inventory FOR SELECT TO authenticated USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "inv_all" ON public.product_inventory FOR ALL TO authenticated USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL,
  qty integer NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  ref_id text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_inv_mov_product ON public.inventory_movements(product_id, created_at);
CREATE POLICY "mov_select" ON public.inventory_movements FOR SELECT TO authenticated USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "mov_all" ON public.inventory_movements FOR ALL TO authenticated USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE TABLE public.demand_forecast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  forecast_qty integer NOT NULL DEFAULT 0,
  confidence numeric,
  drivers jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, product_id, period_month)
);
ALTER TABLE public.demand_forecast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fc_select" ON public.demand_forecast FOR SELECT TO authenticated USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "fc_all" ON public.demand_forecast FOR ALL TO authenticated USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
