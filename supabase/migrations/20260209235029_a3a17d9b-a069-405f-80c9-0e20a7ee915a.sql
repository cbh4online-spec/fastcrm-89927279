
-- Add store-specific triggers to automation_trigger enum
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'store_purchase_completed';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'store_cart_abandoned';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'store_repurchase';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'store_first_purchase';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'store_order_status_changed';

-- Add store-specific actions to automation_action_type enum
ALTER TYPE public.automation_action_type ADD VALUE IF NOT EXISTS 'send_followup_email';
ALTER TYPE public.automation_action_type ADD VALUE IF NOT EXISTS 'trigger_upsell_offer';
ALTER TYPE public.automation_action_type ADD VALUE IF NOT EXISTS 'start_onboarding_flow';
ALTER TYPE public.automation_action_type ADD VALUE IF NOT EXISTS 'activate_ai_assistant';
ALTER TYPE public.automation_action_type ADD VALUE IF NOT EXISTS 'schedule_repurchase_reminder';

-- Table for cart abandonment tracking
CREATE TABLE IF NOT EXISTS public.store_abandoned_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  recovery_status TEXT NOT NULL DEFAULT 'abandoned', -- abandoned, recovered, expired, contacted
  recovery_attempts INTEGER DEFAULT 0,
  last_recovery_at TIMESTAMPTZ,
  recovered_order_id UUID REFERENCES public.store_orders(id) ON DELETE SET NULL,
  abandoned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage abandoned carts in their workspace"
  ON public.store_abandoned_carts
  FOR ALL
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE INDEX idx_store_abandoned_carts_workspace ON public.store_abandoned_carts(workspace_id);
CREATE INDEX idx_store_abandoned_carts_status ON public.store_abandoned_carts(recovery_status);
CREATE INDEX idx_store_abandoned_carts_session ON public.store_abandoned_carts(session_id);

-- Table for store automation event log (links store events to automation runs)
CREATE TABLE IF NOT EXISTS public.store_automation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- purchase_completed, cart_abandoned, repurchase, first_purchase, order_status_changed
  order_id UUID REFERENCES public.store_orders(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  abandoned_cart_id UUID REFERENCES public.store_abandoned_carts(id) ON DELETE SET NULL,
  event_data JSONB DEFAULT '{}',
  automation_rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_automation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view store automation events in their workspace"
  ON public.store_automation_events
  FOR ALL
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE INDEX idx_store_automation_events_workspace ON public.store_automation_events(workspace_id);
CREATE INDEX idx_store_automation_events_type ON public.store_automation_events(event_type);
CREATE INDEX idx_store_automation_events_processed ON public.store_automation_events(processed) WHERE processed = false;
