
-- =====================================================
-- AI EMPLOYEE BUILDER - Schema Creation
-- =====================================================

-- Bot type and status enums
CREATE TYPE public.bot_type AS ENUM ('guided', 'prompt', 'flow');
CREATE TYPE public.bot_status AS ENUM ('draft', 'active', 'paused');

-- =====================================================
-- BOTS TABLE
-- =====================================================
CREATE TABLE public.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type public.bot_type NOT NULL DEFAULT 'guided',
  status public.bot_status NOT NULL DEFAULT 'draft',
  
  -- AI Configuration
  ai_profile_id UUID REFERENCES public.ai_personas(id) ON DELETE SET NULL,
  knowledge_base_ids TEXT[] DEFAULT '{}',
  
  -- Channel assignment
  channel TEXT, -- 'whatsapp', 'instagram', 'widget', 'email', 'sms', etc.
  
  -- Calendar integration
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE SET NULL,
  
  -- Guided mode config
  guided_config JSONB DEFAULT '{}'::jsonb,
  
  -- Prompt mode config
  system_prompt TEXT,
  
  -- Settings
  settings JSONB DEFAULT '{
    "handover_enabled": false,
    "handover_role": null,
    "handover_user_id": null,
    "trigger_keywords": [],
    "max_messages_per_conversation": 50,
    "response_delay_ms": 1500,
    "typing_indicator": true,
    "respect_working_hours": false,
    "working_hours_start": "09:00",
    "working_hours_end": "18:00",
    "working_days": [1,2,3,4,5]
  }'::jsonb,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "bots_select" ON public.bots
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "bots_insert" ON public.bots
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "bots_update" ON public.bots
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "bots_delete" ON public.bots
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

-- Updated_at trigger
CREATE TRIGGER bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- BOT FLOWS TABLE
-- =====================================================
CREATE TABLE public.bot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  flow_json JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bot_flows_select" ON public.bot_flows
  FOR SELECT USING (
    bot_id IN (
      SELECT b.id FROM public.bots b
      WHERE b.workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "bot_flows_insert" ON public.bot_flows
  FOR INSERT WITH CHECK (
    bot_id IN (
      SELECT b.id FROM public.bots b
      WHERE b.workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "bot_flows_update" ON public.bot_flows
  FOR UPDATE USING (
    bot_id IN (
      SELECT b.id FROM public.bots b
      WHERE b.workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "bot_flows_delete" ON public.bot_flows
  FOR DELETE USING (
    bot_id IN (
      SELECT b.id FROM public.bots b
      WHERE b.workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    ) OR public.is_super_admin(auth.uid())
  );

CREATE TRIGGER bot_flows_updated_at
  BEFORE UPDATE ON public.bot_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- BOT ANALYTICS TABLE
-- =====================================================
CREATE TABLE public.bot_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Conversation metrics
  total_conversations INTEGER NOT NULL DEFAULT 0,
  total_messages_sent INTEGER NOT NULL DEFAULT 0,
  total_messages_received INTEGER NOT NULL DEFAULT 0,
  
  -- Business metrics
  total_leads INTEGER NOT NULL DEFAULT 0,
  total_bookings INTEGER NOT NULL DEFAULT 0,
  
  -- Performance metrics
  avg_response_time_ms INTEGER,
  handover_count INTEGER NOT NULL DEFAULT 0,
  handover_rate NUMERIC(5,2),
  
  -- Time window
  period_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(bot_id, period_date)
);

ALTER TABLE public.bot_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bot_analytics_select" ON public.bot_analytics
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "bot_analytics_insert" ON public.bot_analytics
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "bot_analytics_update" ON public.bot_analytics
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

-- =====================================================
-- BOT CONVERSATIONS TABLE (conversation-bot assignments)
-- =====================================================
CREATE TABLE public.bot_conversation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- active, handed_over, completed
  handover_reason TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  
  UNIQUE(conversation_id, bot_id)
);

ALTER TABLE public.bot_conversation_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bot_conv_assignments_select" ON public.bot_conversation_assignments
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "bot_conv_assignments_insert" ON public.bot_conversation_assignments
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "bot_conv_assignments_update" ON public.bot_conversation_assignments
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_bots_workspace_id ON public.bots(workspace_id);
CREATE INDEX idx_bots_status ON public.bots(status);
CREATE INDEX idx_bots_channel ON public.bots(channel);
CREATE INDEX idx_bot_flows_bot_id ON public.bot_flows(bot_id);
CREATE INDEX idx_bot_analytics_bot_id ON public.bot_analytics(bot_id);
CREATE INDEX idx_bot_analytics_period ON public.bot_analytics(period_date);
CREATE INDEX idx_bot_conv_assignments_bot_id ON public.bot_conversation_assignments(bot_id);
CREATE INDEX idx_bot_conv_assignments_conv_id ON public.bot_conversation_assignments(conversation_id);
