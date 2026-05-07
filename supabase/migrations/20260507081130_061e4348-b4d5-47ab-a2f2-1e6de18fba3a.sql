
-- =====================================================================
-- FASE 1U — PLAN MANAGEMENT, ADD-ONS & COMMERCIAL PACKAGING
-- =====================================================================

-- 1. Estender billing_plans
ALTER TABLE public.billing_plans DROP CONSTRAINT IF EXISTS billing_plans_code_check;
ALTER TABLE public.billing_plans ADD CONSTRAINT billing_plans_code_check
  CHECK (code = ANY (ARRAY['free','starter','growth','pro','enterprise','custom','internal','demo']));

ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS seat_limit integer,
  ADD COLUMN IF NOT EXISTS included_seats integer,
  ADD COLUMN IF NOT EXISTS price_per_extra_seat numeric,
  ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS overage_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trial_days integer;

UPDATE public.billing_plans SET slug = code WHERE slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS billing_plans_slug_key ON public.billing_plans(slug);

-- 2. Estender billing_addons
ALTER TABLE public.billing_addons
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS addon_type text NOT NULL DEFAULT 'usage_pack',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS billing_period text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS included_quantity numeric,
  ADD COLUMN IF NOT EXISTS feature_unlocks text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.billing_addons SET slug = code WHERE slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS billing_addons_slug_key ON public.billing_addons(slug);

-- 3. Estender workspace_subscriptions
ALTER TABLE public.workspace_subscriptions
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS manual_billing_notes text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4. platform_features
CREATE TABLE IF NOT EXISTS public.platform_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  module text NOT NULL,
  feature_type text NOT NULL DEFAULT 'boolean',
  default_enabled boolean NOT NULL DEFAULT false,
  requires_addon boolean NOT NULL DEFAULT false,
  beta boolean NOT NULL DEFAULT false,
  internal_only boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pf_select" ON public.platform_features FOR SELECT USING (true);
CREATE POLICY "pf_admin_write" ON public.platform_features FOR ALL
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE TRIGGER trg_platform_features_touch BEFORE UPDATE ON public.platform_features
  FOR EACH ROW EXECUTE FUNCTION tg_billing_touch_updated_at();

-- 5. workspace_upgrade_requests
CREATE TABLE IF NOT EXISTS public.workspace_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  requested_by uuid,
  current_plan_id uuid REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  requested_plan_id uuid REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  requested_addon_id uuid REFERENCES public.billing_addons(id) ON DELETE SET NULL,
  request_type text NOT NULL CHECK (request_type = ANY (ARRAY[
    'plan_upgrade','plan_downgrade','addon_activation','limit_increase','enterprise_contact','custom_quote'
  ])),
  reason text,
  usage_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY[
    'pending','contacted','approved','rejected','completed','cancelled'
  ])),
  assigned_to uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wur_ws_status ON public.workspace_upgrade_requests(workspace_id, status);
ALTER TABLE public.workspace_upgrade_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wur_select" ON public.workspace_upgrade_requests FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));
CREATE POLICY "wur_insert" ON public.workspace_upgrade_requests FOR INSERT
  WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));
CREATE POLICY "wur_update_admin" ON public.workspace_upgrade_requests FOR UPDATE
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE TRIGGER trg_wur_touch BEFORE UPDATE ON public.workspace_upgrade_requests
  FOR EACH ROW EXECUTE FUNCTION tg_billing_touch_updated_at();

-- 6. feature_access_logs
CREATE TABLE IF NOT EXISTS public.feature_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  feature_key text NOT NULL,
  access_result text NOT NULL CHECK (access_result = ANY (ARRAY[
    'allowed','blocked','upgrade_required','limit_reached','addon_required'
  ])),
  plan_id uuid,
  addon_id uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fal_ws_feature ON public.feature_access_logs(workspace_id, feature_key, created_at DESC);
ALTER TABLE public.feature_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fal_select" ON public.feature_access_logs FOR SELECT
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));
-- INSERT só via service_role (sem policy de insert).

-- 7. commercial_packages
CREATE TABLE IF NOT EXISTS public.commercial_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  target_segment text,
  included_plan_id uuid REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  included_addons uuid[] NOT NULL DEFAULT '{}',
  recommended_setup_fee numeric,
  recommended_monthly_price numeric,
  currency text NOT NULL DEFAULT 'EUR',
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  positioning text,
  sales_notes text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commercial_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_select" ON public.commercial_packages FOR SELECT
  USING (active OR is_super_admin(auth.uid()));
CREATE POLICY "cp_admin_write" ON public.commercial_packages FOR ALL
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE TRIGGER trg_cp_touch BEFORE UPDATE ON public.commercial_packages
  FOR EACH ROW EXECUTE FUNCTION tg_billing_touch_updated_at();

-- 8. commercial_setup_packages
CREATE TABLE IF NOT EXISTS public.commercial_setup_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  package_id uuid REFERENCES public.commercial_packages(id) ON DELETE SET NULL,
  setup_fee numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  included_hours integer,
  deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commercial_setup_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csp_select" ON public.commercial_setup_packages FOR SELECT
  USING (active OR is_super_admin(auth.uid()));
CREATE POLICY "csp_admin_write" ON public.commercial_setup_packages FOR ALL
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE TRIGGER trg_csp_touch BEFORE UPDATE ON public.commercial_setup_packages
  FOR EACH ROW EXECUTE FUNCTION tg_billing_touch_updated_at();

-- 9. workspace_plan_overrides
CREATE TABLE IF NOT EXISTS public.workspace_plan_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  feature_key text,
  limit_key text,
  override_value jsonb NOT NULL,
  reason text,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wpo_ws ON public.workspace_plan_overrides(workspace_id);
ALTER TABLE public.workspace_plan_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wpo_select" ON public.workspace_plan_overrides FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));
CREATE POLICY "wpo_admin_write" ON public.workspace_plan_overrides FOR ALL
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE TRIGGER trg_wpo_touch BEFORE UPDATE ON public.workspace_plan_overrides
  FOR EACH ROW EXECUTE FUNCTION tg_billing_touch_updated_at();

-- 10. RPC: check_feature_access
CREATE OR REPLACE FUNCTION public.check_feature_access(
  _workspace_id uuid,
  _feature_key text
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_plan_code text;
  v_features jsonb;
  v_limits jsonb;
  v_enabled boolean := false;
  v_addon_unlock boolean := false;
  v_override jsonb;
BEGIN
  SELECT bp.id, bp.code, bp.features, bp.limits
    INTO v_plan_id, v_plan_code, v_features, v_limits
  FROM workspace_subscriptions ws
  LEFT JOIN billing_plans bp ON bp.id = ws.billing_plan_id
  WHERE ws.workspace_id = _workspace_id
  ORDER BY ws.updated_at DESC
  LIMIT 1;

  IF v_plan_id IS NOT NULL THEN
    SELECT COALESCE(bpf.included, false) INTO v_enabled
    FROM billing_plan_features bpf
    WHERE bpf.plan_id = v_plan_id AND bpf.feature_key = _feature_key
    LIMIT 1;
  END IF;

  IF NOT v_enabled THEN
    SELECT EXISTS (
      SELECT 1 FROM workspace_addons wa
      JOIN billing_addons ba ON ba.id = wa.addon_id
      WHERE wa.workspace_id = _workspace_id
        AND wa.status = 'active'
        AND _feature_key = ANY (ba.feature_unlocks)
    ) INTO v_addon_unlock;
  END IF;

  SELECT override_value INTO v_override
  FROM workspace_plan_overrides
  WHERE workspace_id = _workspace_id
    AND feature_key = _feature_key
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'allowed', (v_enabled OR v_addon_unlock OR v_override IS NOT NULL),
    'plan_code', v_plan_code,
    'plan_enabled', v_enabled,
    'addon_unlock', v_addon_unlock,
    'override', v_override,
    'feature_key', _feature_key
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_feature_access(uuid, text) TO authenticated;
