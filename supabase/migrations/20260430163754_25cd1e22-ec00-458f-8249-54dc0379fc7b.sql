CREATE OR REPLACE FUNCTION public.calculate_fifo_inventory_value(_workspace_id uuid)
 RETURNS TABLE(product_id uuid, product_name text, sku text, category text, current_stock numeric, fifo_avg_cost numeric, total_cost_value numeric, unit_sale_price numeric, total_sale_value numeric, latent_margin numeric, latent_margin_pct numeric)
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
      im.product_id,
      im.created_at,
      CASE WHEN im.type IN ('in','purchase','adjustment_in','return_in') THEN im.qty ELSE 0 END AS qty_in,
      CASE WHEN im.type IN ('out','sale','adjustment_out','return_out','transfer_out') THEN im.qty ELSE 0 END AS qty_out,
      COALESCE(im.unit_cost, 0) AS unit_cost
    FROM inventory_movements im
    WHERE im.workspace_id = _workspace_id

    UNION ALL

    SELECT
      psm.product_id,
      psm.created_at,
      CASE WHEN psm.movement_type IN ('in','purchase','adjustment_in','return') THEN psm.quantity ELSE 0 END AS qty_in,
      CASE WHEN psm.movement_type IN ('out','sale','adjustment_out','transfer') THEN psm.quantity ELSE 0 END AS qty_out,
      COALESCE(psm.unit_cost, 0) AS unit_cost
    FROM product_stock_movements psm
    WHERE psm.workspace_id = _workspace_id
  ),
  fifo_layers AS (
    SELECT
      m.product_id,
      m.created_at,
      m.qty_in,
      m.qty_out,
      m.unit_cost,
      SUM(m.qty_in) OVER (PARTITION BY m.product_id ORDER BY m.created_at, m.qty_out
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_in,
      SUM(m.qty_out) OVER (PARTITION BY m.product_id ORDER BY m.created_at, m.qty_out
                           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_out
    FROM movements m
  ),
  remaining_layers AS (
    SELECT
      fl.product_id,
      fl.unit_cost,
      GREATEST(
        0,
        LEAST(
          fl.qty_in,
          fl.cum_in - GREATEST(fl.cum_in - fl.qty_in, COALESCE(
            (SELECT MAX(cum_out) FROM fifo_layers x WHERE x.product_id = fl.product_id), 0
          ))
        )
      ) AS remaining_qty
    FROM fifo_layers fl
    WHERE fl.qty_in > 0
  ),
  product_valuation AS (
    SELECT
      rl.product_id,
      SUM(rl.remaining_qty) AS stock_qty,
      CASE WHEN SUM(rl.remaining_qty) > 0
        THEN SUM(rl.remaining_qty * rl.unit_cost) / SUM(rl.remaining_qty)
        ELSE 0 END AS avg_cost_fifo,
      SUM(rl.remaining_qty * rl.unit_cost) AS cost_value
    FROM remaining_layers rl
    GROUP BY rl.product_id
  ),
  -- Stock efectivo: prioridade product_inventory > FIFO > products.stock_quantity
  effective AS (
    SELECT
      p.id AS pid,
      COALESCE(pi.stock_on_hand, NULLIF(pv.stock_qty, 0), p.stock_quantity, 0)::numeric AS stock_eff,
      COALESCE(
        NULLIF(pv.avg_cost_fifo, 0),
        NULLIF(p.avg_cost, 0),
        NULLIF(p.last_cost, 0),
        NULLIF(p.direct_cost, 0),
        0
      )::numeric AS cost_eff
    FROM products p
    LEFT JOIN product_inventory pi ON pi.product_id = p.id AND pi.workspace_id = _workspace_id
    LEFT JOIN product_valuation pv ON pv.product_id = p.id
    WHERE p.workspace_id = _workspace_id
  )
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.category,
    e.stock_eff AS current_stock,
    e.cost_eff AS fifo_avg_cost,
    (e.stock_eff * e.cost_eff)::numeric AS total_cost_value,
    COALESCE(p.base_price, 0)::numeric AS unit_sale_price,
    (e.stock_eff * COALESCE(p.base_price, 0))::numeric AS total_sale_value,
    (e.stock_eff * (COALESCE(p.base_price, 0) - e.cost_eff))::numeric AS latent_margin,
    CASE WHEN COALESCE(p.base_price, 0) > 0
      THEN ((COALESCE(p.base_price, 0) - e.cost_eff) / p.base_price * 100)
      ELSE 0 END::numeric AS latent_margin_pct
  FROM products p
  JOIN effective e ON e.pid = p.id
  WHERE p.workspace_id = _workspace_id
    AND COALESCE(p.status, 'active') <> 'archived';
END;
$function$;