-- =============================================
-- MARKETPLACE PRICING & BILLING SYSTEM
-- =============================================

-- 1) MODULE PRICING CONFIGURATIONS
-- Define pricing for each module
CREATE TABLE public.module_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id TEXT NOT NULL UNIQUE,
  
  -- Pricing Model
  pricing_model TEXT NOT NULL DEFAULT 'fixed' CHECK (pricing_model IN ('fixed', 'credits', 'hybrid')),
  
  -- Fixed pricing (monthly)
  base_price_monthly DECIMAL(10,2) DEFAULT 0,
  base_price_yearly DECIMAL(10,2) DEFAULT 0,
  
  -- Credits included in base price
  credits_included INTEGER DEFAULT 0,
  
  -- Credit pricing for extra credits
  credit_price DECIMAL(10,4) DEFAULT 0, -- Price per credit
  
  -- Internal cost tracking (admin only)
  internal_cost_per_credit DECIMAL(10,4) DEFAULT 0,
  
  -- Trial
  trial_days INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) MODULE ACTIONS & CREDIT COSTS
-- Define what actions consume credits
CREATE TABLE public.module_action_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id TEXT NOT NULL,
  
  -- Action definition
  action_key TEXT NOT NULL,
  action_name TEXT NOT NULL,
  action_description TEXT,
  
  -- Credit cost
  credits_cost INTEGER NOT NULL DEFAULT 1,
  
  -- Internal cost (for margin calculation)
  internal_cost DECIMAL(10,4) DEFAULT 0,
  
  -- Is this action visible to customers?
  visible_to_customer BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(module_id, action_key)
);

-- 3) WORKSPACE MODULE SUBSCRIPTIONS
-- Track which modules each workspace has subscribed to
CREATE TABLE public.workspace_module_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  
  -- Subscription status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'suspended')),
  
  -- Billing cycle
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Trial
  trial_end TIMESTAMP WITH TIME ZONE,
  
  -- Stripe references
  stripe_subscription_id TEXT,
  stripe_subscription_item_id TEXT,
  
  -- Metadata
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, module_id)
);

-- 4) WORKSPACE CREDIT BALANCES
-- Track credit balances per workspace per module
CREATE TABLE public.workspace_credit_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  
  -- Balance
  credits_total INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  credits_remaining INTEGER GENERATED ALWAYS AS (credits_total - credits_used) STORED,
  
  -- Period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', now()),
  period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  
  -- Extra purchased credits (don't expire)
  extra_credits INTEGER DEFAULT 0,
  extra_credits_used INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, module_id, period_start)
);

-- 5) CREDIT CONSUMPTION LOGS
-- Detailed log of every credit consumption
CREATE TABLE public.credit_consumption_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  
  -- Action details
  action_key TEXT NOT NULL,
  action_description TEXT,
  
  -- Credits consumed
  credits_consumed INTEGER NOT NULL,
  
  -- From which pool
  from_included BOOLEAN DEFAULT true, -- true = monthly included, false = extra purchased
  
  -- User who triggered
  user_id UUID,
  
  -- Related entity
  entity_type TEXT,
  entity_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6) CREDIT PACKAGES (for purchasing extra credits)
CREATE TABLE public.credit_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Package details
  name TEXT NOT NULL,
  description TEXT,
  
  -- Credits offered
  credits_amount INTEGER NOT NULL,
  
  -- Price
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Discount (for bulk)
  discount_percent INTEGER DEFAULT 0,
  
  -- Applicable modules (null = all)
  module_ids TEXT[],
  
  -- Stripe
  stripe_price_id TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7) CREDIT PURCHASES
CREATE TABLE public.credit_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Package purchased
  package_id UUID REFERENCES public.credit_packages(id),
  module_id TEXT,
  
  -- Credits purchased
  credits_purchased INTEGER NOT NULL,
  
  -- Payment
  amount_paid DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- User
  purchased_by UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8) USAGE ALERTS
CREATE TABLE public.module_usage_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  
  -- Alert type
  alert_type TEXT NOT NULL CHECK (alert_type IN ('usage_80', 'usage_90', 'usage_100', 'trial_ending', 'payment_failed')),
  
  -- Alert data
  message TEXT NOT NULL,
  current_usage INTEGER,
  usage_limit INTEGER,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_by UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9) MODULE BUNDLES
CREATE TABLE public.module_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Bundle details
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE,
  
  -- Industry targeting
  industry TEXT,
  
  -- Modules included
  module_ids TEXT[] NOT NULL,
  
  -- Pricing
  original_price DECIMAL(10,2),
  bundle_price DECIMAL(10,2) NOT NULL,
  discount_percent INTEGER,
  
  -- Stripe
  stripe_price_id TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to check if action can be executed (has credits)
CREATE OR REPLACE FUNCTION public.check_module_credits(
  p_workspace_id UUID,
  p_module_id TEXT,
  p_action_key TEXT
)
RETURNS TABLE(
  can_execute BOOLEAN,
  credits_required INTEGER,
  credits_available INTEGER,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits_cost INTEGER;
  v_credits_remaining INTEGER;
  v_extra_remaining INTEGER;
  v_subscription_status TEXT;
BEGIN
  -- Check subscription status
  SELECT status INTO v_subscription_status
  FROM workspace_module_subscriptions
  WHERE workspace_id = p_workspace_id AND module_id = p_module_id;
  
  IF v_subscription_status IS NULL OR v_subscription_status NOT IN ('active', 'trialing') THEN
    RETURN QUERY SELECT false, 0, 0, 'Módulo não está ativo'::TEXT;
    RETURN;
  END IF;
  
  -- Get action cost
  SELECT credits_cost INTO v_credits_cost
  FROM module_action_costs
  WHERE module_id = p_module_id AND action_key = p_action_key;
  
  IF v_credits_cost IS NULL THEN
    v_credits_cost := 1; -- Default cost
  END IF;
  
  -- Get current balance
  SELECT 
    COALESCE(credits_remaining, 0),
    COALESCE(extra_credits - extra_credits_used, 0)
  INTO v_credits_remaining, v_extra_remaining
  FROM workspace_credit_balances
  WHERE workspace_id = p_workspace_id 
    AND module_id = p_module_id
    AND period_start <= now() 
    AND period_end > now();
  
  IF v_credits_remaining IS NULL THEN
    v_credits_remaining := 0;
    v_extra_remaining := 0;
  END IF;
  
  IF (v_credits_remaining + v_extra_remaining) >= v_credits_cost THEN
    RETURN QUERY SELECT 
      true, 
      v_credits_cost, 
      v_credits_remaining + v_extra_remaining,
      'OK'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      false, 
      v_credits_cost, 
      v_credits_remaining + v_extra_remaining,
      'Créditos insuficientes. Compra mais créditos ou faz upgrade.'::TEXT;
  END IF;
END;
$$;

-- Function to consume credits
CREATE OR REPLACE FUNCTION public.consume_module_credits(
  p_workspace_id UUID,
  p_module_id TEXT,
  p_action_key TEXT,
  p_user_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(
  success BOOLEAN,
  credits_consumed INTEGER,
  credits_remaining INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits_cost INTEGER;
  v_balance_id UUID;
  v_credits_remaining INTEGER;
  v_extra_remaining INTEGER;
  v_from_included BOOLEAN;
  v_action_desc TEXT;
  v_usage_percent INTEGER;
BEGIN
  -- Get action cost and description
  SELECT credits_cost, action_description INTO v_credits_cost, v_action_desc
  FROM module_action_costs
  WHERE module_id = p_module_id AND action_key = p_action_key;
  
  IF v_credits_cost IS NULL THEN
    v_credits_cost := 1;
    v_action_desc := p_action_key;
  END IF;
  
  -- Get current balance
  SELECT id, COALESCE(credits_remaining, 0), COALESCE(extra_credits - extra_credits_used, 0)
  INTO v_balance_id, v_credits_remaining, v_extra_remaining
  FROM workspace_credit_balances
  WHERE workspace_id = p_workspace_id 
    AND module_id = p_module_id
    AND period_start <= now() 
    AND period_end > now();
  
  IF v_balance_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'Sem balanço de créditos ativo'::TEXT;
    RETURN;
  END IF;
  
  -- Check if enough credits
  IF (v_credits_remaining + v_extra_remaining) < v_credits_cost THEN
    RETURN QUERY SELECT false, 0, v_credits_remaining + v_extra_remaining, 'Créditos insuficientes'::TEXT;
    RETURN;
  END IF;
  
  -- Consume from included first, then extra
  IF v_credits_remaining >= v_credits_cost THEN
    UPDATE workspace_credit_balances
    SET credits_used = credits_used + v_credits_cost, updated_at = now()
    WHERE id = v_balance_id;
    v_from_included := true;
  ELSE
    -- Split between included and extra
    UPDATE workspace_credit_balances
    SET 
      credits_used = credits_total,
      extra_credits_used = extra_credits_used + (v_credits_cost - v_credits_remaining),
      updated_at = now()
    WHERE id = v_balance_id;
    v_from_included := false;
  END IF;
  
  -- Log consumption
  INSERT INTO credit_consumption_logs (
    workspace_id, module_id, action_key, action_description,
    credits_consumed, from_included, user_id,
    entity_type, entity_id, metadata
  ) VALUES (
    p_workspace_id, p_module_id, p_action_key, v_action_desc,
    v_credits_cost, v_from_included, p_user_id,
    p_entity_type, p_entity_id, p_metadata
  );
  
  -- Get updated balance
  SELECT credits_remaining + (extra_credits - extra_credits_used)
  INTO v_credits_remaining
  FROM workspace_credit_balances
  WHERE id = v_balance_id;
  
  -- Check for usage alerts
  SELECT credits_total INTO v_usage_percent FROM workspace_credit_balances WHERE id = v_balance_id;
  IF v_usage_percent > 0 THEN
    SELECT ROUND(((v_usage_percent - v_credits_remaining)::NUMERIC / v_usage_percent::NUMERIC) * 100)::INTEGER INTO v_usage_percent;
    
    IF v_usage_percent >= 80 AND v_usage_percent < 90 THEN
      INSERT INTO module_usage_alerts (workspace_id, module_id, alert_type, message, current_usage, usage_limit)
      VALUES (p_workspace_id, p_module_id, 'usage_80', 'Estás a usar 80% dos teus créditos mensais.', v_usage_percent, 100)
      ON CONFLICT DO NOTHING;
    ELSIF v_usage_percent >= 90 AND v_usage_percent < 100 THEN
      INSERT INTO module_usage_alerts (workspace_id, module_id, alert_type, message, current_usage, usage_limit)
      VALUES (p_workspace_id, p_module_id, 'usage_90', 'Estás a usar 90% dos teus créditos! Considera comprar mais.', v_usage_percent, 100)
      ON CONFLICT DO NOTHING;
    ELSIF v_usage_percent >= 100 THEN
      INSERT INTO module_usage_alerts (workspace_id, module_id, alert_type, message, current_usage, usage_limit)
      VALUES (p_workspace_id, p_module_id, 'usage_100', 'Atingiste o limite de créditos mensais!', v_usage_percent, 100)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN QUERY SELECT true, v_credits_cost, v_credits_remaining, 'Créditos consumidos com sucesso'::TEXT;
END;
$$;

-- Function to add credits (after purchase)
CREATE OR REPLACE FUNCTION public.add_module_credits(
  p_workspace_id UUID,
  p_module_id TEXT,
  p_credits INTEGER,
  p_is_extra BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_is_extra THEN
    UPDATE workspace_credit_balances
    SET extra_credits = extra_credits + p_credits, updated_at = now()
    WHERE workspace_id = p_workspace_id 
      AND module_id = p_module_id
      AND period_start <= now() 
      AND period_end > now();
  ELSE
    UPDATE workspace_credit_balances
    SET credits_total = credits_total + p_credits, updated_at = now()
    WHERE workspace_id = p_workspace_id 
      AND module_id = p_module_id
      AND period_start <= now() 
      AND period_end > now();
  END IF;
  
  RETURN FOUND;
END;
$$;

-- Function to calculate module margin (admin)
CREATE OR REPLACE FUNCTION public.calculate_module_margin(
  p_module_id TEXT,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', now()),
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TABLE(
  total_revenue DECIMAL,
  total_internal_cost DECIMAL,
  gross_margin DECIMAL,
  margin_percent DECIMAL,
  total_credits_consumed INTEGER,
  total_subscriptions INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH consumption AS (
    SELECT 
      SUM(ccl.credits_consumed) as credits,
      SUM(ccl.credits_consumed * COALESCE(mac.internal_cost, 0)) as internal_cost
    FROM credit_consumption_logs ccl
    LEFT JOIN module_action_costs mac ON mac.module_id = ccl.module_id AND mac.action_key = ccl.action_key
    WHERE ccl.module_id = p_module_id
      AND ccl.created_at BETWEEN p_start_date AND p_end_date
  ),
  subscriptions AS (
    SELECT 
      COUNT(*) as sub_count,
      SUM(CASE WHEN billing_cycle = 'monthly' THEN mp.base_price_monthly ELSE mp.base_price_yearly / 12 END) as revenue
    FROM workspace_module_subscriptions wms
    JOIN module_pricing mp ON mp.module_id = wms.module_id
    WHERE wms.module_id = p_module_id
      AND wms.status = 'active'
  )
  SELECT 
    COALESCE(s.revenue, 0),
    COALESCE(c.internal_cost, 0),
    COALESCE(s.revenue, 0) - COALESCE(c.internal_cost, 0),
    CASE WHEN COALESCE(s.revenue, 0) > 0 
      THEN ROUND(((COALESCE(s.revenue, 0) - COALESCE(c.internal_cost, 0)) / s.revenue) * 100, 2)
      ELSE 0 
    END,
    COALESCE(c.credits, 0)::INTEGER,
    COALESCE(s.sub_count, 0)::INTEGER
  FROM consumption c, subscriptions s;
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Module Pricing (public read, admin write)
ALTER TABLE public.module_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Module pricing is viewable by everyone" 
ON public.module_pricing FOR SELECT USING (is_active = true);

-- Module Action Costs (public read visible ones)
ALTER TABLE public.module_action_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Action costs are viewable by everyone" 
ON public.module_action_costs FOR SELECT USING (visible_to_customer = true);

-- Workspace Module Subscriptions
ALTER TABLE public.workspace_module_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace subscriptions"
ON public.workspace_module_subscriptions FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage workspace subscriptions"
ON public.workspace_module_subscriptions FOR ALL
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
));

-- Workspace Credit Balances
ALTER TABLE public.workspace_credit_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace credit balances"
ON public.workspace_credit_balances FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

-- Credit Consumption Logs
ALTER TABLE public.credit_consumption_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace consumption"
ON public.credit_consumption_logs FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

-- Credit Packages (public read)
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Credit packages are viewable by everyone"
ON public.credit_packages FOR SELECT USING (is_active = true);

-- Credit Purchases
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace purchases"
ON public.credit_purchases FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

-- Module Usage Alerts
ALTER TABLE public.module_usage_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace alerts"
ON public.module_usage_alerts FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their workspace alerts"
ON public.module_usage_alerts FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

-- Module Bundles (public read)
ALTER TABLE public.module_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bundles are viewable by everyone"
ON public.module_bundles FOR SELECT USING (is_active = true);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_workspace_module_subs_workspace ON workspace_module_subscriptions(workspace_id);
CREATE INDEX idx_workspace_module_subs_module ON workspace_module_subscriptions(module_id);
CREATE INDEX idx_workspace_credit_balances_workspace ON workspace_credit_balances(workspace_id, module_id);
CREATE INDEX idx_credit_consumption_workspace ON credit_consumption_logs(workspace_id, module_id);
CREATE INDEX idx_credit_consumption_created ON credit_consumption_logs(created_at);
CREATE INDEX idx_module_usage_alerts_workspace ON module_usage_alerts(workspace_id, is_read);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamps
CREATE TRIGGER update_module_pricing_updated_at
BEFORE UPDATE ON public.module_pricing
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_module_subscriptions_updated_at
BEFORE UPDATE ON public.workspace_module_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_credit_balances_updated_at
BEFORE UPDATE ON public.workspace_credit_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();