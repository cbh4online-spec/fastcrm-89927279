-- Fix the view to use SECURITY INVOKER (the safer default)
DROP VIEW IF EXISTS public.product_usage_stats;

CREATE VIEW public.product_usage_stats 
WITH (security_invoker = true) AS
SELECT 
  p.id as product_id,
  p.workspace_id,
  p.name as product_name,
  p.base_price,
  p.direct_cost,
  p.operational_cost,
  p.commission_default,
  COUNT(DISTINCT pi.proposal_id) as total_proposals,
  COUNT(DISTINCT CASE WHEN pr.status = 'accepted' THEN pi.proposal_id END) as accepted_proposals,
  COUNT(DISTINCT CASE WHEN pr.status = 'published' THEN pi.proposal_id END) as published_proposals,
  COALESCE(SUM(CASE WHEN pr.status = 'accepted' THEN pi.total_price END), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN pr.status = 'accepted' AND pr.updated_at >= NOW() - INTERVAL '30 days' THEN pi.total_price END), 0) as revenue_30d,
  COALESCE(SUM(CASE WHEN pr.status = 'accepted' AND pr.updated_at >= NOW() - INTERVAL '90 days' THEN pi.total_price END), 0) as revenue_90d,
  COALESCE(SUM(CASE WHEN pr.status = 'accepted' AND pr.updated_at >= NOW() - INTERVAL '1 year' THEN pi.total_price END), 0) as revenue_1y,
  COUNT(DISTINCT CASE WHEN pr.status = 'accepted' THEN pi.id END) as total_sales,
  COUNT(DISTINCT CASE WHEN pr.status = 'accepted' AND pr.updated_at >= NOW() - INTERVAL '30 days' THEN pi.id END) as sales_30d,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN pr.status = 'accepted' THEN pi.id END) > 0 
    THEN COALESCE(SUM(CASE WHEN pr.status = 'accepted' THEN pi.total_price END), 0) / COUNT(DISTINCT CASE WHEN pr.status = 'accepted' THEN pi.id END)
    ELSE 0 
  END as avg_ticket,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN pr.status = 'accepted' AND pi.cost_snapshot IS NOT NULL THEN pi.id END) > 0
    THEN AVG(CASE WHEN pr.status = 'accepted' AND pi.cost_snapshot IS NOT NULL THEN ((pi.unit_price - pi.cost_snapshot) / NULLIF(pi.unit_price, 0)) * 100 END)
    ELSE NULL
  END as avg_margin_pct,
  COALESCE(SUM(CASE WHEN pr.status = 'accepted' AND pi.commission_pct_snapshot IS NOT NULL THEN pi.total_price * (pi.commission_pct_snapshot / 100) END), 0) as total_commission,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN pr.status IN ('published', 'accepted', 'rejected', 'expired') THEN pi.proposal_id END) > 0
    THEN (COUNT(DISTINCT CASE WHEN pr.status = 'accepted' THEN pi.proposal_id END)::numeric / COUNT(DISTINCT CASE WHEN pr.status IN ('published', 'accepted', 'rejected', 'expired') THEN pi.proposal_id END)) * 100
    ELSE 0
  END as acceptance_rate,
  MAX(CASE WHEN pr.status = 'accepted' THEN pr.updated_at END) as last_sale_at
FROM public.products p
LEFT JOIN public.proposal_items pi ON pi.product_id = p.id
LEFT JOIN public.proposals pr ON pr.id = pi.proposal_id
GROUP BY p.id, p.workspace_id, p.name, p.base_price, p.direct_cost, p.operational_cost, p.commission_default;