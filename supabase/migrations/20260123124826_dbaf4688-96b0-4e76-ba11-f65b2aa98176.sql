-- =====================================================
-- SUBSCRIPTIONS & RECURRING BILLING SCHEMA
-- =====================================================

-- Billing cycles enum
DO $$ BEGIN
  CREATE TYPE billing_cycle AS ENUM ('weekly', 'monthly', 'quarterly', 'semi_annual', 'annual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Subscription status enum
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('draft', 'active', 'paused', 'cancelled', 'expired', 'past_due');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment method type
DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('stripe', 'bank_transfer', 'check', 'cash', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Customer reference (one of these)
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Origin (optional link to opportunity)
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  
  -- Subscription details
  name TEXT NOT NULL,
  description TEXT,
  status subscription_status NOT NULL DEFAULT 'draft',
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  
  -- Pricing
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Dates
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_billing_date DATE,
  cancelled_at TIMESTAMPTZ,
  
  -- Payment method
  payment_method payment_method_type NOT NULL DEFAULT 'bank_transfer',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  
  -- Contract details
  contract_value NUMERIC(12,2),
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  renewal_reminder_days INTEGER DEFAULT 30,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "subscriptions_insert" ON public.subscriptions FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "subscriptions_update" ON public.subscriptions FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "subscriptions_delete" ON public.subscriptions FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_subscriptions_workspace ON public.subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_contact ON public.subscriptions(contact_id);
CREATE INDEX idx_subscriptions_company ON public.subscriptions(company_id);
CREATE INDEX idx_subscriptions_opportunity ON public.subscriptions(opportunity_id);
CREATE INDEX idx_subscriptions_next_billing ON public.subscriptions(next_billing_date);

-- Trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();