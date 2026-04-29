-- 1) PRODUCTS: cost mode + base columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS direct_cost_mode text NOT NULL DEFAULT 'value',
  ADD COLUMN IF NOT EXISTS operational_cost_mode text NOT NULL DEFAULT 'value',
  ADD COLUMN IF NOT EXISTS operational_cost_base text NOT NULL DEFAULT 'price',
  ADD COLUMN IF NOT EXISTS commission_mode text NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS commission_base text NOT NULL DEFAULT 'price',
  ADD COLUMN IF NOT EXISTS tax_rate_mode text NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS target_margin_mode text NOT NULL DEFAULT 'percent';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_direct_cost_mode_chk,
  DROP CONSTRAINT IF EXISTS products_operational_cost_mode_chk,
  DROP CONSTRAINT IF EXISTS products_operational_cost_base_chk,
  DROP CONSTRAINT IF EXISTS products_commission_mode_chk,
  DROP CONSTRAINT IF EXISTS products_commission_base_chk,
  DROP CONSTRAINT IF EXISTS products_tax_rate_mode_chk,
  DROP CONSTRAINT IF EXISTS products_target_margin_mode_chk;

ALTER TABLE public.products
  ADD CONSTRAINT products_direct_cost_mode_chk CHECK (direct_cost_mode IN ('value','percent')),
  ADD CONSTRAINT products_operational_cost_mode_chk CHECK (operational_cost_mode IN ('value','percent')),
  ADD CONSTRAINT products_operational_cost_base_chk CHECK (operational_cost_base IN ('price','direct_cost')),
  ADD CONSTRAINT products_commission_mode_chk CHECK (commission_mode IN ('value','percent')),
  ADD CONSTRAINT products_commission_base_chk CHECK (commission_base IN ('price','direct_cost')),
  ADD CONSTRAINT products_tax_rate_mode_chk CHECK (tax_rate_mode IN ('value','percent')),
  ADD CONSTRAINT products_target_margin_mode_chk CHECK (target_margin_mode IN ('value','percent'));

-- 2) PRODUCT_CATEGORIES: cost defaults
ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS default_direct_cost numeric,
  ADD COLUMN IF NOT EXISTS default_direct_cost_mode text DEFAULT 'value',
  ADD COLUMN IF NOT EXISTS default_operational_cost numeric,
  ADD COLUMN IF NOT EXISTS default_operational_cost_mode text DEFAULT 'value',
  ADD COLUMN IF NOT EXISTS default_operational_cost_base text DEFAULT 'price',
  ADD COLUMN IF NOT EXISTS default_commission numeric,
  ADD COLUMN IF NOT EXISTS default_commission_mode text DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS default_commission_base text DEFAULT 'price',
  ADD COLUMN IF NOT EXISTS default_tax_rate numeric,
  ADD COLUMN IF NOT EXISTS default_tax_rate_mode text DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS default_target_margin numeric,
  ADD COLUMN IF NOT EXISTS default_target_margin_mode text DEFAULT 'percent';

ALTER TABLE public.product_categories
  DROP CONSTRAINT IF EXISTS pcat_default_direct_cost_mode_chk,
  DROP CONSTRAINT IF EXISTS pcat_default_op_cost_mode_chk,
  DROP CONSTRAINT IF EXISTS pcat_default_op_cost_base_chk,
  DROP CONSTRAINT IF EXISTS pcat_default_commission_mode_chk,
  DROP CONSTRAINT IF EXISTS pcat_default_commission_base_chk,
  DROP CONSTRAINT IF EXISTS pcat_default_tax_rate_mode_chk,
  DROP CONSTRAINT IF EXISTS pcat_default_target_margin_mode_chk;

ALTER TABLE public.product_categories
  ADD CONSTRAINT pcat_default_direct_cost_mode_chk CHECK (default_direct_cost_mode IN ('value','percent')),
  ADD CONSTRAINT pcat_default_op_cost_mode_chk CHECK (default_operational_cost_mode IN ('value','percent')),
  ADD CONSTRAINT pcat_default_op_cost_base_chk CHECK (default_operational_cost_base IN ('price','direct_cost')),
  ADD CONSTRAINT pcat_default_commission_mode_chk CHECK (default_commission_mode IN ('value','percent')),
  ADD CONSTRAINT pcat_default_commission_base_chk CHECK (default_commission_base IN ('price','direct_cost')),
  ADD CONSTRAINT pcat_default_tax_rate_mode_chk CHECK (default_tax_rate_mode IN ('value','percent')),
  ADD CONSTRAINT pcat_default_target_margin_mode_chk CHECK (default_target_margin_mode IN ('value','percent'));

-- 3) RPC: apply category costs to products in that category (and optionally subcategories)
CREATE OR REPLACE FUNCTION public.apply_category_costs_to_products(
  p_category_id uuid,
  p_include_subcategories boolean DEFAULT true,
  p_fields text[] DEFAULT ARRAY['direct_cost','operational_cost','commission','tax_rate','target_margin']
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_user_id uuid := auth.uid();
  v_cat record;
  v_affected integer := 0;
  v_category_ids uuid[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_cat FROM public.product_categories WHERE id = p_category_id;
  IF v_cat IS NULL THEN
    RAISE EXCEPTION 'Category not found';
  END IF;
  v_workspace_id := v_cat.workspace_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = v_workspace_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not a workspace member';
  END IF;

  -- Collect target categories
  IF p_include_subcategories THEN
    WITH RECURSIVE descendants AS (
      SELECT id FROM public.product_categories WHERE id = p_category_id
      UNION ALL
      SELECT c.id FROM public.product_categories c
      JOIN descendants d ON c.parent_id = d.id
    )
    SELECT array_agg(id) INTO v_category_ids FROM descendants;
  ELSE
    v_category_ids := ARRAY[p_category_id];
  END IF;

  -- Update products: only fields requested. Match products by category text name OR category_id if exists.
  UPDATE public.products p SET
    direct_cost = CASE WHEN 'direct_cost' = ANY(p_fields) AND v_cat.default_direct_cost IS NOT NULL
                       THEN v_cat.default_direct_cost ELSE p.direct_cost END,
    direct_cost_mode = CASE WHEN 'direct_cost' = ANY(p_fields) AND v_cat.default_direct_cost IS NOT NULL
                            THEN COALESCE(v_cat.default_direct_cost_mode,'value') ELSE p.direct_cost_mode END,
    operational_cost = CASE WHEN 'operational_cost' = ANY(p_fields) AND v_cat.default_operational_cost IS NOT NULL
                            THEN v_cat.default_operational_cost ELSE p.operational_cost END,
    operational_cost_mode = CASE WHEN 'operational_cost' = ANY(p_fields) AND v_cat.default_operational_cost IS NOT NULL
                                 THEN COALESCE(v_cat.default_operational_cost_mode,'value') ELSE p.operational_cost_mode END,
    operational_cost_base = CASE WHEN 'operational_cost' = ANY(p_fields) AND v_cat.default_operational_cost IS NOT NULL
                                 THEN COALESCE(v_cat.default_operational_cost_base,'price') ELSE p.operational_cost_base END,
    commission_default = CASE WHEN 'commission' = ANY(p_fields) AND v_cat.default_commission IS NOT NULL
                              THEN v_cat.default_commission ELSE p.commission_default END,
    commission_mode = CASE WHEN 'commission' = ANY(p_fields) AND v_cat.default_commission IS NOT NULL
                           THEN COALESCE(v_cat.default_commission_mode,'percent') ELSE p.commission_mode END,
    commission_base = CASE WHEN 'commission' = ANY(p_fields) AND v_cat.default_commission IS NOT NULL
                           THEN COALESCE(v_cat.default_commission_base,'price') ELSE p.commission_base END,
    tax_rate_estimate = CASE WHEN 'tax_rate' = ANY(p_fields) AND v_cat.default_tax_rate IS NOT NULL
                             THEN v_cat.default_tax_rate ELSE p.tax_rate_estimate END,
    tax_rate_mode = CASE WHEN 'tax_rate' = ANY(p_fields) AND v_cat.default_tax_rate IS NOT NULL
                         THEN COALESCE(v_cat.default_tax_rate_mode,'percent') ELSE p.tax_rate_mode END,
    target_margin = CASE WHEN 'target_margin' = ANY(p_fields) AND v_cat.default_target_margin IS NOT NULL
                         THEN v_cat.default_target_margin ELSE p.target_margin END,
    target_margin_mode = CASE WHEN 'target_margin' = ANY(p_fields) AND v_cat.default_target_margin IS NOT NULL
                              THEN COALESCE(v_cat.default_target_margin_mode,'percent') ELSE p.target_margin_mode END,
    updated_at = now()
  WHERE p.workspace_id = v_workspace_id
    AND p.category IN (SELECT name FROM public.product_categories WHERE id = ANY(v_category_ids));

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'affected_products', v_affected,
    'category_id', p_category_id,
    'category_name', v_cat.name,
    'included_subcategories', p_include_subcategories
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_category_costs_to_products(uuid, boolean, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_category_costs_to_products(uuid, boolean, text[]) TO authenticated;