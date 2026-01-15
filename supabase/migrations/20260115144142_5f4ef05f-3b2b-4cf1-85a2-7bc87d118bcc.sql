-- Add financial fields to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS operational_cost NUMERIC(12,2) CHECK (operational_cost IS NULL OR operational_cost >= 0),
ADD COLUMN IF NOT EXISTS tax_rate_estimate_pct NUMERIC(5,2) CHECK (tax_rate_estimate_pct IS NULL OR (tax_rate_estimate_pct >= 0 AND tax_rate_estimate_pct <= 100)),
ADD COLUMN IF NOT EXISTS target_margin_pct NUMERIC(5,2) CHECK (target_margin_pct IS NULL OR (target_margin_pct >= 0 AND target_margin_pct <= 100));

-- Create proposal_items table for product tracking in proposals
CREATE TABLE IF NOT EXISTS public.proposal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  cost_snapshot NUMERIC(12,2),
  operational_cost_snapshot NUMERIC(12,2),
  commission_pct_snapshot NUMERIC(5,2),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for proposal_items
CREATE POLICY "Users can view proposal items in their workspace"
ON public.proposal_items FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create proposal items in their workspace"
ON public.proposal_items FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update proposal items in their workspace"
ON public.proposal_items FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete proposal items in their workspace"
ON public.proposal_items FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON public.proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_product ON public.proposal_items(product_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_workspace ON public.proposal_items(workspace_id);

-- Create trigger for updated_at
CREATE TRIGGER update_proposal_items_updated_at
BEFORE UPDATE ON public.proposal_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create product_usage_stats view for KPIs
CREATE OR REPLACE VIEW public.product_usage_stats AS
SELECT 
  p.id as product_id,
  p.workspace_id,
  p.name as product_name,
  p.base_price,
  p.direct_cost,
  p.operational_cost,
  p.commission_default,
  -- Proposal stats
  COUNT(DISTINCT pi.proposal_id) as total_proposals,
  COUNT(DISTINCT CASE WHEN pr.status = 'accepted' THEN pi.proposal_id END) as accepted_proposals,
  COUNT(DISTINCT CASE WHEN pr.status = 'published' THEN pi.proposal_id END) as published_proposals,
  -- Revenue stats
  COALESCE(SUM(CASE WHEN pr.status = 'accepted' THEN pi.total_price END), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN pr.status = 'accepted' AND pr.updated_at >= NOW() - INTERVAL '30 days' THEN pi.total_price END), 0) as revenue_30d,
  COALESCE(SUM(CASE WHEN pr.status = 'accepted' AND pr.updated_at >= NOW() - INTERVAL '90 days' THEN pi.total_price END), 0) as revenue_90d,
  COALESCE(SUM(CASE WHEN pr.status = 'accepted' AND pr.updated_at >= NOW() - INTERVAL '1 year' THEN pi.total_price END), 0) as revenue_1y,
  -- Sales count
  COUNT(DISTINCT CASE WHEN pr.status = 'accepted' THEN pi.id END) as total_sales,
  COUNT(DISTINCT CASE WHEN pr.status = 'accepted' AND pr.updated_at >= NOW() - INTERVAL '30 days' THEN pi.id END) as sales_30d,
  -- Average ticket
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN pr.status = 'accepted' THEN pi.id END) > 0 
    THEN COALESCE(SUM(CASE WHEN pr.status = 'accepted' THEN pi.total_price END), 0) / COUNT(DISTINCT CASE WHEN pr.status = 'accepted' THEN pi.id END)
    ELSE 0 
  END as avg_ticket,
  -- Margin stats (using snapshots)
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN pr.status = 'accepted' AND pi.cost_snapshot IS NOT NULL THEN pi.id END) > 0
    THEN AVG(CASE WHEN pr.status = 'accepted' AND pi.cost_snapshot IS NOT NULL THEN ((pi.unit_price - pi.cost_snapshot) / NULLIF(pi.unit_price, 0)) * 100 END)
    ELSE NULL
  END as avg_margin_pct,
  -- Commission stats
  COALESCE(SUM(CASE WHEN pr.status = 'accepted' AND pi.commission_pct_snapshot IS NOT NULL THEN pi.total_price * (pi.commission_pct_snapshot / 100) END), 0) as total_commission,
  -- Acceptance rate
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN pr.status IN ('published', 'accepted', 'rejected', 'expired') THEN pi.proposal_id END) > 0
    THEN (COUNT(DISTINCT CASE WHEN pr.status = 'accepted' THEN pi.proposal_id END)::numeric / COUNT(DISTINCT CASE WHEN pr.status IN ('published', 'accepted', 'rejected', 'expired') THEN pi.proposal_id END)) * 100
    ELSE 0
  END as acceptance_rate,
  -- Last sale date
  MAX(CASE WHEN pr.status = 'accepted' THEN pr.updated_at END) as last_sale_at
FROM public.products p
LEFT JOIN public.proposal_items pi ON pi.product_id = p.id
LEFT JOIN public.proposals pr ON pr.id = pi.proposal_id
GROUP BY p.id, p.workspace_id, p.name, p.base_price, p.direct_cost, p.operational_cost, p.commission_default;