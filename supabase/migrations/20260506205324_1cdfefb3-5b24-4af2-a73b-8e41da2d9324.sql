-- Fase 1M: Sync billing_plan -> cost_guard_limits
-- Quando uma workspace_subscription muda de plano (ou é criada activa),
-- recria os cost_guard_limits desse workspace a partir de billing_plan_features.

-- Coluna de origem para distinguir limites criados pelo plano vs custom
ALTER TABLE public.cost_guard_limits
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_plan_id uuid;

-- Mapa feature_key -> usage_type esperado em cost_guard_limits.
-- Convenção: feature_key da billing_plan_features que termine em "_monthly"
-- ou tenha limit_value numérico é tratado como limite com period='monthly'.
CREATE OR REPLACE FUNCTION public.sync_cost_guard_from_plan(p_workspace_id uuid, p_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f RECORD;
  v_usage_type text;
  v_period text;
BEGIN
  -- Apagar limites previamente sincronizados do plano para este workspace
  DELETE FROM public.cost_guard_limits
   WHERE workspace_id = p_workspace_id
     AND source = 'plan';

  IF p_plan_id IS NULL THEN
    RETURN;
  END IF;

  FOR f IN
    SELECT feature_key, limit_value, limit_unit, included
      FROM public.billing_plan_features
     WHERE plan_id = p_plan_id
       AND included = true
       AND limit_value IS NOT NULL
  LOOP
    -- Inferir período: se feature_key contém "_monthly" -> monthly, "_daily" -> daily, default monthly
    IF f.feature_key LIKE '%_daily%' THEN
      v_period := 'daily';
    ELSIF f.feature_key LIKE '%_yearly%' OR f.feature_key LIKE '%_annual%' THEN
      v_period := 'yearly';
    ELSE
      v_period := 'monthly';
    END IF;

    -- Normalizar usage_type (remover sufixos de período)
    v_usage_type := regexp_replace(f.feature_key, '_(monthly|daily|yearly|annual)$', '');

    INSERT INTO public.cost_guard_limits(
      workspace_id, plan_id, source_module, usage_type, limit_period,
      included_quantity, hard_limit_quantity, soft_limit_percentage,
      block_when_exceeded, notify_when_soft_limit, notify_when_hard_limit,
      active, source, source_plan_id
    )
    VALUES (
      p_workspace_id, p_plan_id, 'billing', v_usage_type, v_period,
      f.limit_value, f.limit_value, 80,
      true, true, true,
      true, 'plan', p_plan_id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Trigger: ao inserir/actualizar workspace_subscriptions activo, ressincroniza limites
CREATE OR REPLACE FUNCTION public.workspace_subscription_sync_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('active','trialing','past_due') AND NEW.billing_plan_id IS NOT NULL THEN
      PERFORM public.sync_cost_guard_from_plan(NEW.workspace_id, NEW.billing_plan_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.billing_plan_id IS DISTINCT FROM OLD.billing_plan_id)
       OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('active','trialing','past_due')) THEN
      PERFORM public.sync_cost_guard_from_plan(NEW.workspace_id, NEW.billing_plan_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workspace_subscription_sync_limits ON public.workspace_subscriptions;
CREATE TRIGGER trg_workspace_subscription_sync_limits
AFTER INSERT OR UPDATE ON public.workspace_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.workspace_subscription_sync_limits();