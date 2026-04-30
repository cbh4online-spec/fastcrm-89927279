-- =========================================================
-- Smart Composite Products Engine — Sprint 1
-- =========================================================

CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id uuid, _workspace_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role::text = ANY(_roles)
  );
$$;

-- 1. Estender product_kits
ALTER TABLE public.product_kits
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS composition_type text NOT NULL DEFAULT 'fixed_kit',
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'sum_components',
  ADD COLUMN IF NOT EXISTS fixed_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount_pct numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_margin_pct numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visibility_b2b boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sales_channels text[] DEFAULT ARRAY['internal']::text[],
  ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS margin_guard_level text DEFAULT 'safe',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.product_kits DROP CONSTRAINT IF EXISTS product_kits_composition_type_check;
ALTER TABLE public.product_kits ADD CONSTRAINT product_kits_composition_type_check
  CHECK (composition_type IN ('fixed_kit','configurable_kit','dynamic_bundle','assembled_product','campaign_bundle','replenishment_pack','ai_suggested_pack'));

ALTER TABLE public.product_kits DROP CONSTRAINT IF EXISTS product_kits_pricing_mode_check;
ALTER TABLE public.product_kits ADD CONSTRAINT product_kits_pricing_mode_check
  CHECK (pricing_mode IN ('sum_components','fixed_price','discount_on_sum','min_margin','per_channel','per_segment','per_tier'));

ALTER TABLE public.product_kits DROP CONSTRAINT IF EXISTS product_kits_status_check;
ALTER TABLE public.product_kits ADD CONSTRAINT product_kits_status_check
  CHECK (status IN ('draft','pending_approval','active','paused','archived'));

ALTER TABLE public.product_kits DROP CONSTRAINT IF EXISTS product_kits_margin_guard_check;
ALTER TABLE public.product_kits ADD CONSTRAINT product_kits_margin_guard_check
  CHECK (margin_guard_level IN ('safe','attention','danger','not_recommended'));

CREATE INDEX IF NOT EXISTS idx_pkits_status ON public.product_kits(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_pkits_sku ON public.product_kits(workspace_id, sku) WHERE sku IS NOT NULL;

-- 2. Estender product_kit_items
ALTER TABLE public.product_kit_items
  ADD COLUMN IF NOT EXISTS is_required boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS allows_substitution boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost_snapshot numeric(12,2),
  ADD COLUMN IF NOT EXISTS unit_price_snapshot numeric(12,2),
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_pkitems_group ON public.product_kit_items(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pkitems_product ON public.product_kit_items(product_id);

-- 3. Grupos de escolha
CREATE TABLE IF NOT EXISTS public.composite_product_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kit_id uuid NOT NULL REFERENCES product_kits(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_required boolean DEFAULT true,
  min_choices integer DEFAULT 1,
  max_choices integer DEFAULT 1,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cpg_min_le_max CHECK (min_choices <= max_choices)
);
CREATE INDEX IF NOT EXISTS idx_cpg_kit ON public.composite_product_groups(kit_id);
CREATE INDEX IF NOT EXISTS idx_cpg_ws ON public.composite_product_groups(workspace_id);

DO $$ BEGIN
  ALTER TABLE public.product_kit_items
    ADD CONSTRAINT product_kit_items_group_fk FOREIGN KEY (group_id)
    REFERENCES composite_product_groups(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Substitutos
CREATE TABLE IF NOT EXISTS public.composite_product_substitutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kit_id uuid NOT NULL REFERENCES product_kits(id) ON DELETE CASCADE,
  original_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  substitute_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  priority integer DEFAULT 1,
  reason text,
  estimated_margin_pct numeric(5,2),
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cps_diff_products CHECK (original_product_id <> substitute_product_id)
);
CREATE INDEX IF NOT EXISTS idx_cps_kit ON public.composite_product_substitutes(kit_id);
CREATE INDEX IF NOT EXISTS idx_cps_orig ON public.composite_product_substitutes(original_product_id);

-- 5. Pricing rules
CREATE TABLE IF NOT EXISTS public.composite_product_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kit_id uuid NOT NULL REFERENCES product_kits(id) ON DELETE CASCADE,
  rule_type text NOT NULL,
  channel text,
  client_segment text,
  min_quantity integer DEFAULT 1,
  price numeric(12,2),
  discount_pct numeric(5,2),
  is_active boolean DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cppr_rule_type_check CHECK (rule_type IN ('channel','segment','tier','campaign'))
);
CREATE INDEX IF NOT EXISTS idx_cppr_kit ON public.composite_product_pricing_rules(kit_id);

-- 6. Simulações
CREATE TABLE IF NOT EXISTS public.composite_product_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kit_id uuid NOT NULL REFERENCES product_kits(id) ON DELETE CASCADE,
  user_id uuid,
  expected_quantity integer NOT NULL DEFAULT 1,
  total_cost numeric(12,2),
  total_revenue numeric(12,2),
  margin_pct numeric(5,2),
  required_stock jsonb,
  missing_components jsonb,
  margin_risk text,
  recommendation text,
  inputs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_sim_kit ON public.composite_product_simulations(kit_id, created_at DESC);

-- 7. Sugestões da IA
CREATE TABLE IF NOT EXISTS public.composite_product_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL,
  kit_id uuid REFERENCES product_kits(id) ON DELETE SET NULL,
  client_id uuid,
  title text NOT NULL,
  rationale text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_margin_pct numeric(5,2),
  estimated_revenue numeric(12,2),
  confidence numeric(3,2),
  status text NOT NULL DEFAULT 'pending_validation',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cpai_status_check CHECK (status IN ('pending_validation','approved','rejected','converted')),
  CONSTRAINT cpai_type_check CHECK (suggestion_type IN ('new_kit','complementary','substitution','price','margin','sales_argument','seasonal_pack','cross_sell','low_margin_alert','purchase_components'))
);
CREATE INDEX IF NOT EXISTS idx_cpai_ws_status ON public.composite_product_ai_suggestions(workspace_id, status, created_at DESC);

-- Triggers updated_at
DO $$ BEGIN
  CREATE TRIGGER trg_cpg_updated BEFORE UPDATE ON composite_product_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_cps_updated BEFORE UPDATE ON composite_product_substitutes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_cppr_updated BEFORE UPDATE ON composite_product_pricing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_cpai_updated BEFORE UPDATE ON composite_product_ai_suggestions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS
ALTER TABLE public.composite_product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composite_product_substitutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composite_product_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composite_product_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composite_product_ai_suggestions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['composite_product_groups','composite_product_substitutes','composite_product_pricing_rules'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_write" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_write" ON public.%I FOR ALL TO authenticated USING (has_workspace_role(auth.uid(), workspace_id, ARRAY[''owner'',''admin''])) WITH CHECK (has_workspace_role(auth.uid(), workspace_id, ARRAY[''owner'',''admin'']))', t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS cps_sim_select ON composite_product_simulations;
CREATE POLICY cps_sim_select ON composite_product_simulations FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));
DROP POLICY IF EXISTS cps_sim_insert ON composite_product_simulations;
CREATE POLICY cps_sim_insert ON composite_product_simulations FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS cpai_select ON composite_product_ai_suggestions;
CREATE POLICY cpai_select ON composite_product_ai_suggestions FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));
DROP POLICY IF EXISTS cpai_write ON composite_product_ai_suggestions;
CREATE POLICY cpai_write ON composite_product_ai_suggestions FOR ALL TO authenticated
  USING (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']))
  WITH CHECK (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']));

DROP POLICY IF EXISTS pkits_update ON product_kits;
CREATE POLICY pkits_update ON product_kits FOR UPDATE TO authenticated
  USING (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']))
  WITH CHECK (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']));
DROP POLICY IF EXISTS pkits_delete ON product_kits;
CREATE POLICY pkits_delete ON product_kits FOR DELETE TO authenticated
  USING (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']));

-- RPC: Stock virtual
CREATE OR REPLACE FUNCTION public.get_composite_kit_stock(_kit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ws_id uuid;
  _available integer;
  _limiting jsonb;
  _missing jsonb;
BEGIN
  SELECT workspace_id INTO _ws_id FROM product_kits WHERE id = _kit_id;
  IF _ws_id IS NULL THEN
    RETURN jsonb_build_object('error','kit_not_found');
  END IF;
  IF NOT is_workspace_member(auth.uid(), _ws_id) AND NOT is_super_admin(auth.uid()) THEN
    RETURN jsonb_build_object('error','forbidden');
  END IF;

  WITH comp AS (
    SELECT 
      i.product_id,
      p.name AS product_name,
      i.quantity AS qty_required,
      COALESCE(p.stock_quantity, 0) AS stock,
      i.is_required,
      CASE WHEN i.quantity > 0 THEN FLOOR(COALESCE(p.stock_quantity,0)::numeric / i.quantity) ELSE 0 END AS units_possible
    FROM product_kit_items i
    LEFT JOIN products p ON p.id = i.product_id
    WHERE i.kit_id = _kit_id AND i.product_id IS NOT NULL AND i.is_required = true
  )
  SELECT 
    COALESCE(MIN(units_possible)::integer, 0),
    (SELECT to_jsonb(c) FROM comp c WHERE c.units_possible = (SELECT MIN(units_possible) FROM comp) LIMIT 1),
    COALESCE(jsonb_agg(to_jsonb(c2)) FILTER (WHERE c2.stock < c2.qty_required), '[]'::jsonb)
  INTO _available, _limiting, _missing
  FROM comp c2;

  RETURN jsonb_build_object(
    'kit_id', _kit_id,
    'available_units', COALESCE(_available, 0),
    'limiting_component', _limiting,
    'missing_components', COALESCE(_missing, '[]'::jsonb),
    'computed_at', now()
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_composite_kit_stock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(uuid, uuid, text[]) TO authenticated;