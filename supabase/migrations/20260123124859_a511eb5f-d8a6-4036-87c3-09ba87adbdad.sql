-- =====================================================
-- SUBSCRIPTION ITEMS (Line items for subscriptions)
-- =====================================================
CREATE TABLE public.subscription_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Product reference
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  
  -- Item details
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_items_select" ON public.subscription_items FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "subscription_items_all" ON public.subscription_items FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- =====================================================
-- SUBSCRIPTION BILLING RECORDS (Payment records per period)
-- =====================================================
CREATE TABLE public.subscription_billing_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL DEFAULT 'payment',
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Amount
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Billing period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Payment details
  payment_method payment_method_type,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Invoice reference
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  
  -- Dates
  due_date DATE,
  paid_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_billing_records_select" ON public.subscription_billing_records FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "subscription_billing_records_all" ON public.subscription_billing_records FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX idx_subscription_billing_records_subscription ON public.subscription_billing_records(subscription_id);
CREATE INDEX idx_subscription_billing_records_status ON public.subscription_billing_records(status);
CREATE INDEX idx_subscription_billing_records_period ON public.subscription_billing_records(period_start, period_end);

CREATE TRIGGER update_subscription_billing_records_updated_at
  BEFORE UPDATE ON public.subscription_billing_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SUBSCRIPTION METRICS (Pre-calculated SaaS metrics)
-- =====================================================
CREATE TABLE public.subscription_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Period
  period_date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  
  -- MRR Metrics
  mrr NUMERIC(12,2) NOT NULL DEFAULT 0,
  arr NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Subscription counts
  active_subscriptions INTEGER NOT NULL DEFAULT 0,
  new_subscriptions INTEGER NOT NULL DEFAULT 0,
  churned_subscriptions INTEGER NOT NULL DEFAULT 0,
  
  -- Revenue breakdown
  new_mrr NUMERIC(12,2) NOT NULL DEFAULT 0,
  expansion_mrr NUMERIC(12,2) NOT NULL DEFAULT 0,
  contraction_mrr NUMERIC(12,2) NOT NULL DEFAULT 0,
  churned_mrr NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_mrr_change NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Rates
  churn_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  retention_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  net_revenue_retention NUMERIC(5,2) NOT NULL DEFAULT 0,
  
  -- Customer metrics
  total_customers INTEGER NOT NULL DEFAULT 0,
  avg_revenue_per_customer NUMERIC(12,2) NOT NULL DEFAULT 0,
  ltv_estimate NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Calculated at
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, period_date, period_type)
);

ALTER TABLE public.subscription_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_metrics_select" ON public.subscription_metrics FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "subscription_metrics_all" ON public.subscription_metrics FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX idx_subscription_metrics_period ON public.subscription_metrics(workspace_id, period_date);