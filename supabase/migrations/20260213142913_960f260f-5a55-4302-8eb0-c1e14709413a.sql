
-- =============================================
-- Phase 2: Human Handover + Workflow Triggers + Bot Transfer
-- =============================================

-- 1. AI Workflow Triggers
CREATE TABLE public.ai_workflow_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL,
  action_name TEXT NOT NULL,
  trigger_condition_text TEXT NOT NULL,
  examples TEXT[] NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_workflow_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workflow triggers" ON public.ai_workflow_triggers
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage workflow triggers" ON public.ai_workflow_triggers
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE INDEX idx_ai_workflow_triggers_bot ON public.ai_workflow_triggers(bot_id) WHERE is_active = true;

-- 2. Bot Transfer Rules
CREATE TABLE public.bot_transfer_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_bot_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  to_bot_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  trigger_condition_text TEXT NOT NULL,
  examples TEXT[] NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT different_bots CHECK (from_bot_id != to_bot_id)
);

ALTER TABLE public.bot_transfer_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view transfer rules" ON public.bot_transfer_rules
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage transfer rules" ON public.bot_transfer_rules
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE INDEX idx_bot_transfer_rules_from ON public.bot_transfer_rules(from_bot_id) WHERE is_active = true;

-- 3. Add handover config fields to conversation_ai_state (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'conversation_ai_state' AND column_name = 'handover_reason'
  ) THEN
    ALTER TABLE public.conversation_ai_state ADD COLUMN handover_reason TEXT NULL;
    ALTER TABLE public.conversation_ai_state ADD COLUMN handover_message TEXT NULL;
    ALTER TABLE public.conversation_ai_state ADD COLUMN handover_at TIMESTAMPTZ NULL;
  END IF;
END $$;
