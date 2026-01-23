-- Create subscription_events event type enum
CREATE TYPE public.subscription_event_type AS ENUM (
  'created',
  'payment_succeeded',
  'payment_failed',
  'paused',
  'resumed',
  'canceled',
  'renewed',
  'plan_changed',
  'manual_adjustment'
);

-- Create subscription_events table for audit/timeline
CREATE TABLE public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type public.subscription_event_type NOT NULL,
  amount NUMERIC(15, 2),
  currency TEXT DEFAULT 'EUR',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view subscription events in their workspace"
  ON public.subscription_events FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create subscription events in their workspace"
  ON public.subscription_events FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_subscription_events_subscription_id ON public.subscription_events(subscription_id);
CREATE INDEX idx_subscription_events_workspace_id ON public.subscription_events(workspace_id);
CREATE INDEX idx_subscription_events_event_type ON public.subscription_events(event_type);
CREATE INDEX idx_subscription_events_occurred_at ON public.subscription_events(occurred_at DESC);

-- Add comment
COMMENT ON TABLE public.subscription_events IS 'Audit trail and timeline for subscription lifecycle events';