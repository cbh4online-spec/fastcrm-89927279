CREATE TABLE public.bgi_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  indicator_id text NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('month','quarter','year')),
  period_start date NOT NULL,
  target_value numeric NOT NULL CHECK (target_value > 0),
  direction text NOT NULL DEFAULT 'gte' CHECK (direction IN ('gte','lte')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 500),
  archived_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bgi_objectives_active_uniq ON public.bgi_objectives (workspace_id, indicator_id, period_type, period_start) WHERE archived_at IS NULL;
CREATE INDEX bgi_objectives_ws_period ON public.bgi_objectives (workspace_id, period_type, period_start);

GRANT SELECT, INSERT, UPDATE ON public.bgi_objectives TO authenticated;
GRANT ALL ON public.bgi_objectives TO service_role;
ALTER TABLE public.bgi_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bgi objectives read by members" ON public.bgi_objectives FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));
CREATE POLICY "bgi objectives insert by managers" ON public.bgi_objectives FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_workspace(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "bgi objectives update by managers" ON public.bgi_objectives FOR UPDATE TO authenticated
  USING (public.can_manage_workspace(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.can_manage_workspace(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.bgi_objectives_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.indicator_id NOT IN ('revenue_invoiced','revenue_received','open_balance','pipeline_value','weighted_forecast','orders','avg_order','active_customers','repeat_rate','enrollments','class_occupancy','revenue_per_course','new_leads','lead_conversion','closed_deals') THEN
    RAISE EXCEPTION 'Indicador sem cálculo disponível';
  END IF;
  NEW.period_start := date_trunc(NEW.period_type, NEW.period_start::timestamp)::date;
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  ELSE
    NEW.workspace_id := OLD.workspace_id;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_bgi_objectives_validate BEFORE INSERT OR UPDATE ON public.bgi_objectives
  FOR EACH ROW EXECUTE FUNCTION public.bgi_objectives_validate();
CREATE TRIGGER trg_bgi_objectives_audit AFTER INSERT OR UPDATE ON public.bgi_objectives
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

COMMENT ON TABLE public.business_objectives IS 'LEGACY: growth objectives now live in bgi_objectives';
COMMENT ON TABLE public.objective_metrics IS 'LEGACY: growth objectives now live in bgi_objectives';
COMMENT ON TABLE public.objective_plans IS 'LEGACY: growth objectives now live in bgi_objectives';
COMMENT ON TABLE public.sales_goals IS 'LEGACY: growth objectives now live in bgi_objectives';