
-- Add Stripe subscription tracking columns to renewal_contracts
ALTER TABLE public.renewal_contracts 
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Create renewal_payment_events table for tracking payment movements
CREATE TABLE IF NOT EXISTS public.renewal_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.renewal_contracts(id) ON DELETE CASCADE,
  stripe_event_id text,
  event_type text NOT NULL,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'EUR',
  stripe_invoice_id text,
  stripe_subscription_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stripe_event_id)
);

-- Enable RLS
ALTER TABLE public.renewal_payment_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for renewal_payment_events
CREATE POLICY "Members can view payment events"
  ON public.renewal_payment_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = renewal_payment_events.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- Service role inserts (webhook)
CREATE POLICY "Service role can insert payment events"
  ON public.renewal_payment_events FOR INSERT
  WITH CHECK (true);
