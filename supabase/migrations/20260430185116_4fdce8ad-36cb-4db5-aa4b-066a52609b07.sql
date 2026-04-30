DROP FUNCTION IF EXISTS public.get_workspace_inventory_summary(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_fifo_inventory_value(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_fifo_inventory_value(_workspace_id uuid)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  sku text,
  category text,
  current_stock numeric,
  fifo_avg_cost numeric,
  operational_cost_unit numeric,
  total_unit_cost numeric,
  total_cost_value numeric,
  unit_sale_price numeric,
  suggested_base_price numeric,
  total_sale_value numeric,
  latent_margin numeric,
  latent_margin_pct numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = _workspace_id AND wm.user_id = auth.uid()
  ) AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied to workspace %', _workspace_id;
  END IF;

  RETURN QUERY
  WITH movements AS (
    SELECT
      im.product_id, im.created_at,
      CASE WHEN im.type IN ('in','purchase','adjustment_in','return_in') THEN im.qty ELSE 0 END AS qty_in,
      CASE WHEN im.type IN ('out','sale','adjustment_out','return_out','transfer_out') THEN im.qty ELSE 0 END AS qty_out,
      COALESCE(im.unit_cost, 0) AS unit_cost
    FROM inventory_movements im
    WHERE im.workspace_id = _workspace_id
    UNION ALL
    SELECT
      psm.product_id, psm.created_at,
      CASE WHEN psm.movement_type IN ('in','purchase','adjustment_in','return') THEN psm.quantity ELSE 0 END AS qty_in,
      CASE WHEN psm.movement_type IN ('out','sale','adjustment_out','transfer') THEN psm.quantity ELSE 0 END AS qty_out,
      COALESCE(psm.unit_cost, 0) AS unit_cost
    FROM product_stock_movements psm
    WHERE psm.workspace_id = _workspace_id
  ),
  fifo_layers AS (
    SELECT m.product_id, m.created_at, m.qty_in, m.qty_out, m.unit_cost,
      SUM(m.qty_in) OVER (PARTITION BY m.product_id ORDER BY m.created_at, m.qty_out
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_in,
      SUM(m.qty_out) OVER (PARTITION BY m.product_id ORDER BY m.created_at, m.qty_out
                           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_out
    FROM movements m
  ),
  remaining_layers AS (
    SELECT fl.product_id, fl.unit_cost,
      GREATEST(0, LEAST(fl.qty_in,
        fl.cum_in - GREATEST(fl.cum_in - fl.qty_in, COALESCE(
          (SELECT MAX(cum_out) FROM fifo_layers x WHERE x.product_id = fl.product_id), 0
        )))) AS remaining_qty
    FROM fifo_layers fl
    WHERE fl.qty_in > 0
  ),
  product_valuation AS (
    SELECT rl.product_id, SUM(rl.remaining_qty) AS stock_qty,
      CASE WHEN SUM(rl.remaining_qty) > 0
        THEN SUM(rl.remaining_qty * rl.unit_cost) / SUM(rl.remaining_qty)
        ELSE 0 END AS avg_cost_fifo
    FROM remaining_layers rl GROUP BY rl.product_id
  ),
  effective AS (
    SELECT p.id AS pid,
      COALESCE(pi.stock_on_hand, NULLIF(pv.stock_qty, 0), p.stock_quantity, 0)::numeric AS stock_eff,
      COALESCE(NULLIF(pv.avg_cost_fifo, 0), NULLIF(p.avg_cost, 0), NULLIF(p.last_cost, 0), NULLIF(p.direct_cost, 0), 0)::numeric AS cost_eff
    FROM products p
    LEFT JOIN product_inventory pi ON pi.product_id = p.id AND pi.workspace_id = _workspace_id
    LEFT JOIN product_valuation pv ON pv.product_id = p.id
    WHERE p.workspace_id = _workspace_id
  ),
  computed AS (
    SELECT
      p.id, p.name, p.sku, p.category,
      e.stock_eff, e.cost_eff,
      CASE
        WHEN COALESCE(p.operational_cost_mode, 'value') = 'percent'
          THEN e.cost_eff * (COALESCE(p.operational_cost, 0) / 100.0)
        ELSE COALESCE(p.operational_cost, 0)
      END::numeric AS op_cost_unit,
      COALESCE(p.base_price, 0)::numeric AS base_price_curr,
      COALESCE(p.target_margin_pct, 0)::numeric AS target_pct
    FROM products p
    JOIN effective e ON e.pid = p.id
    WHERE p.workspace_id = _workspace_id
      AND COALESCE(p.status, 'active') <> 'archived'
  )
  SELECT
    c.id, c.name, c.sku, c.category,
    c.stock_eff, c.cost_eff, c.op_cost_unit,
    (c.cost_eff + c.op_cost_unit)::numeric,
    (c.stock_eff * (c.cost_eff + c.op_cost_unit))::numeric,
    c.base_price_curr,
    CASE
      WHEN c.target_pct > 0 AND c.target_pct < 100
        THEN ((c.cost_eff + c.op_cost_unit) / (1 - c.target_pct / 100.0))::numeric
      ELSE NULL
    END,
    (c.stock_eff * c.base_price_curr)::numeric,
    (c.stock_eff * (c.base_price_curr - (c.cost_eff + c.op_cost_unit)))::numeric,
    CASE WHEN c.base_price_curr > 0
      THEN ((c.base_price_curr - (c.cost_eff + c.op_cost_unit)) / c.base_price_curr * 100)::numeric
      ELSE 0 END
  FROM computed c;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_workspace_inventory_summary(_workspace_id uuid)
RETURNS TABLE(
  total_products bigint,
  total_units numeric,
  total_cost_value numeric,
  total_operational_cost_value numeric,
  total_sale_value numeric,
  total_latent_margin numeric,
  avg_margin_pct numeric,
  zero_stock_count bigint,
  negative_margin_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = _workspace_id AND wm.user_id = auth.uid()
  ) AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH v AS (SELECT * FROM calculate_fifo_inventory_value(_workspace_id))
  SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(v.current_stock), 0)::numeric,
    COALESCE(SUM(v.total_cost_value), 0)::numeric,
    COALESCE(SUM(v.current_stock * v.operational_cost_unit), 0)::numeric,
    COALESCE(SUM(v.total_sale_value), 0)::numeric,
    COALESCE(SUM(v.latent_margin), 0)::numeric,
    CASE WHEN COALESCE(SUM(v.total_sale_value), 0) > 0
      THEN (SUM(v.latent_margin) / SUM(v.total_sale_value) * 100)
      ELSE 0 END::numeric,
    COUNT(*) FILTER (WHERE v.current_stock <= 0)::bigint,
    COUNT(*) FILTER (WHERE v.current_stock > 0 AND v.latent_margin < 0)::bigint
  FROM v;
END;
$function$;