-- =====================================================
-- ADD RECURRING BILLING FIELDS TO OPPORTUNITIES
-- =====================================================

-- Billing type enum
DO $$ BEGIN
  CREATE TYPE billing_type AS ENUM ('one_time', 'recurring');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Billing frequency enum
DO $$ BEGIN
  CREATE TYPE billing_frequency AS ENUM ('weekly', 'monthly', 'quarterly', 'semi_annual', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Opportunity subscription status enum
DO $$ BEGIN
  CREATE TYPE opportunity_subscription_status AS ENUM ('draft', 'active', 'paused', 'past_due', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment provider enum
DO $$ BEGIN
  CREATE TYPE payment_provider AS ENUM ('stripe', 'manual', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to opportunities table
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS billing_type billing_type DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS mrr_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_frequency billing_frequency,
  ADD COLUMN IF NOT EXISTS contract_months INTEGER,
  ADD COLUMN IF NOT EXISTS tcv_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS renewal_date DATE,
  ADD COLUMN IF NOT EXISTS subscription_status opportunity_subscription_status,
  ADD COLUMN IF NOT EXISTS churn_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider payment_provider DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_payment_date DATE,
  ADD COLUMN IF NOT EXISTS next_payment_date DATE;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_opportunities_billing_type ON public.opportunities(billing_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_subscription_status ON public.opportunities(subscription_status);
CREATE INDEX IF NOT EXISTS idx_opportunities_renewal_date ON public.opportunities(renewal_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_next_payment_date ON public.opportunities(next_payment_date);

-- Add comment for documentation
COMMENT ON COLUMN public.opportunities.billing_type IS 'Type of billing: one_time or recurring';
COMMENT ON COLUMN public.opportunities.mrr_amount IS 'Monthly Recurring Revenue amount';
COMMENT ON COLUMN public.opportunities.billing_frequency IS 'How often billing occurs';
COMMENT ON COLUMN public.opportunities.contract_months IS 'Total contract duration in months';
COMMENT ON COLUMN public.opportunities.tcv_amount IS 'Total Contract Value';
COMMENT ON COLUMN public.opportunities.subscription_status IS 'Current subscription status for recurring opportunities';
COMMENT ON COLUMN public.opportunities.churn_reason IS 'Reason for cancellation/churn';