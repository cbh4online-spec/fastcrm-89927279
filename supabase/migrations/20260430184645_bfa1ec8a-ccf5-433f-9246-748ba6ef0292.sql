CREATE OR REPLACE FUNCTION public.get_workspace_inventory_summary(_workspace_id uuid)
RETURNS TABLE(total_products bigint, total_units numeric, total_cost_value numeric, total_sale_value numeric, total_latent_margin numeric, avg_margin_pct numeric, zero_stock_count bigint, negative_margin_count bigint)
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
  WITH v AS (
    SELECT * FROM calculate_fifo_inventory_value(_workspace_id)
  )
  SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(v.current_stock), 0)::numeric,
    COALESCE(SUM(v.total_cost_value), 0)::numeric,
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