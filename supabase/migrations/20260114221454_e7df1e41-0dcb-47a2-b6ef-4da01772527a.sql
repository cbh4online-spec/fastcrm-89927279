-- Add automation_state enum
CREATE TYPE public.automation_state AS ENUM ('draft', 'active', 'paused', 'error');

-- Add state column to automation_rules (default to 'active' for backwards compatibility, but mark inactive as 'draft')
ALTER TABLE public.automation_rules 
ADD COLUMN IF NOT EXISTS state public.automation_state DEFAULT 'draft';

-- Update existing rules based on is_active
UPDATE public.automation_rules SET state = 'active' WHERE is_active = true;
UPDATE public.automation_rules SET state = 'draft' WHERE is_active = false;

-- Create table for tracking executions per entity (rate limiting)
CREATE TABLE IF NOT EXISTS public.automation_execution_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  execution_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_execution_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (rule_id, entity_type, entity_id)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_execution_tracking_lookup 
ON public.automation_execution_tracking(rule_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_execution_tracking_window 
ON public.automation_execution_tracking(window_start);

-- Create table for Stripe event idempotency
CREATE TABLE IF NOT EXISTS public.stripe_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_event_lookup 
ON public.stripe_event_log(stripe_event_id);

-- Create table for automation chain tracking (loop prevention)
CREATE TABLE IF NOT EXISTS public.automation_chain_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  chain_id UUID NOT NULL,
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  depth INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chain_tracking_lookup 
ON public.automation_chain_tracking(chain_id, entity_type, entity_id);

-- Auto-cleanup old tracking records (older than 24 hours)
CREATE INDEX IF NOT EXISTS idx_chain_tracking_cleanup 
ON public.automation_chain_tracking(created_at);

CREATE INDEX IF NOT EXISTS idx_execution_tracking_cleanup 
ON public.automation_execution_tracking(window_start);

-- Enable RLS
ALTER TABLE public.automation_execution_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_chain_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for automation_execution_tracking
CREATE POLICY "Users can view their workspace execution tracking" 
ON public.automation_execution_tracking 
FOR SELECT 
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can insert execution tracking" 
ON public.automation_execution_tracking 
FOR INSERT 
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update execution tracking" 
ON public.automation_execution_tracking 
FOR UPDATE 
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- RLS policies for stripe_event_log
CREATE POLICY "Users can view their workspace stripe events" 
ON public.stripe_event_log 
FOR SELECT 
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can insert stripe events" 
ON public.stripe_event_log 
FOR INSERT 
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- RLS policies for automation_chain_tracking
CREATE POLICY "Users can view their workspace chain tracking" 
ON public.automation_chain_tracking 
FOR SELECT 
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can insert chain tracking" 
ON public.automation_chain_tracking 
FOR INSERT 
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Add global automation pause setting if not exists
INSERT INTO public.admin_settings (key, value, description)
VALUES (
  'automations_global_pause',
  'false'::jsonb,
  'When true, all automations are paused globally'
)
ON CONFLICT (key) DO NOTHING;

-- Add rate limit settings
INSERT INTO public.admin_settings (key, value, description)
VALUES (
  'automation_rate_limits',
  '{"max_per_entity_per_hour": 10, "max_chain_depth": 5, "window_minutes": 60}'::jsonb,
  'Rate limiting configuration for automations'
)
ON CONFLICT (key) DO NOTHING;