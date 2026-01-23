-- =====================================================
-- SUBSCRIPTIONS TABLE (CREATE OR UPDATE)
-- =====================================================

-- Drop existing table if it exists to recreate with correct structure
DROP TABLE IF EXISTS public.subscription_billing_records CASCADE;
DROP TABLE IF EXISTS public.subscription_items CASCADE;
DROP TABLE IF EXISTS public.subscription_metrics CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- Subscription status enum (reuse if exists)
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'past_due', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- References
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  
  -- Subscription details
  status subscription_status NOT NULL DEFAULT 'active',
  mrr_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  frequency billing_frequency NOT NULL DEFAULT 'monthly',
  
  -- Dates
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_period_start DATE,
  current_period_end DATE,
  renewal_date DATE,
  
  -- Payment provider
  provider payment_provider NOT NULL DEFAULT 'manual',
  provider_subscription_id TEXT,
  
  -- Payment tracking
  last_payment_date DATE,
  next_payment_date DATE,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  
  -- Audit
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
CREATE INDEX idx_subscriptions_opportunity ON public.subscriptions(opportunity_id);
CREATE INDEX idx_subscriptions_company ON public.subscriptions(company_id);
CREATE INDEX idx_subscriptions_contact ON public.subscriptions(contact_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_renewal_date ON public.subscriptions(renewal_date);
CREATE INDEX idx_subscriptions_next_payment ON public.subscriptions(next_payment_date);
CREATE INDEX idx_subscriptions_provider ON public.subscriptions(provider, provider_subscription_id);

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.subscriptions IS 'Recurring billing subscriptions linked to opportunities';
COMMENT ON COLUMN public.subscriptions.mrr_amount IS 'Monthly Recurring Revenue for this subscription';
COMMENT ON COLUMN public.subscriptions.provider_subscription_id IS 'External subscription ID (e.g., Stripe subscription ID)';