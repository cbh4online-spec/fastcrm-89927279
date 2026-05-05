-- Conversation routing rules table
CREATE TABLE public.conversation_routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Conditions (all optional, combined with AND)
  match_intents TEXT[] DEFAULT '{}',           -- e.g. ['sales','support']
  match_priorities TEXT[] DEFAULT '{}',        -- ['high','medium','low']
  match_sentiments TEXT[] DEFAULT '{}',        -- ['positive','neutral','negative']
  match_tags TEXT[] DEFAULT '{}',              -- ANY of these tags present
  match_channels TEXT[] DEFAULT '{}',          -- whatsapp, email, ...
  min_value NUMERIC,                            -- min potential_value_estimate
  -- Assignment strategy
  assignment_strategy TEXT NOT NULL DEFAULT 'specific_user'
    CHECK (assignment_strategy IN ('specific_user','round_robin','least_busy','commercial_profile')),
  assign_to_user_id UUID,                       -- for specific_user
  assign_to_user_ids UUID[] DEFAULT '{}',       -- for round_robin / least_busy pool
  assign_to_profile TEXT,                       -- for commercial_profile (e.g. 'sales','support')
  -- Side effects
  add_tags TEXT[] DEFAULT '{}',
  set_priority TEXT CHECK (set_priority IN ('high','medium','low')),
  notify_user BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_conv_routing_rules_ws ON public.conversation_routing_rules(workspace_id, is_active, priority DESC);

ALTER TABLE public.conversation_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view routing rules"
  ON public.conversation_routing_rules FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert routing rules"
  ON public.conversation_routing_rules FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update routing rules"
  ON public.conversation_routing_rules FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete routing rules"
  ON public.conversation_routing_rules FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE TRIGGER update_conv_routing_rules_updated_at
  BEFORE UPDATE ON public.conversation_routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Routing decisions log
CREATE TABLE public.conversation_routing_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  rule_id UUID,
  rule_name TEXT,
  assigned_to UUID,
  previous_assigned_to UUID,
  strategy TEXT,
  reason TEXT,
  matched_conditions JSONB,
  added_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_conv_routing_log_conv ON public.conversation_routing_log(conversation_id, created_at DESC);
CREATE INDEX idx_conv_routing_log_ws ON public.conversation_routing_log(workspace_id, created_at DESC);

ALTER TABLE public.conversation_routing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view routing log"
  ON public.conversation_routing_log FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Inserts only via service_role (edge function)
CREATE POLICY "Service role inserts routing log"
  ON public.conversation_routing_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');