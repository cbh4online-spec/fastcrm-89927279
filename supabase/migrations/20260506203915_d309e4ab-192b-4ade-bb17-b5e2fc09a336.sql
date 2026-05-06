-- Fase 1M: Stripe Real Billing & Checkout
-- Estende billing_plans com IDs Stripe e cria tabela de eventos para idempotência

-- 1) Colunas Stripe em billing_plans
ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id_annual TEXT,
  ADD COLUMN IF NOT EXISTS stripe_mode TEXT NOT NULL DEFAULT 'test' CHECK (stripe_mode IN ('test','live')),
  ADD COLUMN IF NOT EXISTS stripe_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS trial_period_days INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_billing_plans_stripe_product
  ON public.billing_plans(stripe_product_id) WHERE stripe_product_id IS NOT NULL;

-- 2) Tabela de eventos Stripe processados (idempotência) específica para Fase 1M
CREATE TABLE IF NOT EXISTS public.billing_stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  workspace_id UUID,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processed','failed','skipped')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_stripe_events_workspace
  ON public.billing_stripe_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_events_type
  ON public.billing_stripe_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_events_subscription
  ON public.billing_stripe_events(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.billing_stripe_events ENABLE ROW LEVEL SECURITY;

-- Apenas super admins/admins do workspace podem ler eventos; service_role escreve
DROP POLICY IF EXISTS "billing_stripe_events_select_admin" ON public.billing_stripe_events;
CREATE POLICY "billing_stripe_events_select_admin"
  ON public.billing_stripe_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = billing_stripe_events.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner','admin')
      )
    )
  );

-- 3) Adicionar campos faltantes em workspace_subscriptions para sincronização completa
ALTER TABLE public.workspace_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_latest_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_status TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS last_payment_failure_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS stripe_mode TEXT DEFAULT 'test' CHECK (stripe_mode IN ('test','live'));

CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_stripe_sub
  ON public.workspace_subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_stripe_customer
  ON public.workspace_subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;