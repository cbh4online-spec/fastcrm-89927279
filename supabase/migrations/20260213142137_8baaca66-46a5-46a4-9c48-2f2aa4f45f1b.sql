
-- 1. bot_knowledge_bases: Many-to-Many ai_agents <-> knowledge_bases
CREATE TABLE public.bot_knowledge_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bot_id, knowledge_base_id)
);

CREATE INDEX idx_bot_knowledge_bases_bot ON public.bot_knowledge_bases(bot_id);
CREATE INDEX idx_bot_knowledge_bases_workspace ON public.bot_knowledge_bases(workspace_id);

ALTER TABLE public.bot_knowledge_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view bot KBs in their workspace"
  ON public.bot_knowledge_bases FOR SELECT
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Admins can manage bot KBs"
  ON public.bot_knowledge_bases FOR ALL
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner')));

-- Trigger: max 7 KBs per bot
CREATE OR REPLACE FUNCTION public.validate_bot_kb_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.bot_knowledge_bases WHERE bot_id = NEW.bot_id) >= 7 THEN
    RAISE EXCEPTION 'Maximum of 7 knowledge bases per bot reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_bot_kb_limit
  BEFORE INSERT ON public.bot_knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION public.validate_bot_kb_limit();

-- 2. ai_message_audit: Audit trail for AI responses
CREATE TABLE public.ai_message_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  message_id UUID NULL,
  conversation_id UUID NOT NULL,
  bot_id UUID NULL REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  prompt_used TEXT,
  rag_chunks JSONB DEFAULT '[]',
  intent JSONB DEFAULT '{}',
  model_meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_message_audit_message ON public.ai_message_audit(message_id);
CREATE INDEX idx_ai_message_audit_conversation ON public.ai_message_audit(conversation_id);
CREATE INDEX idx_ai_message_audit_workspace ON public.ai_message_audit(workspace_id);

ALTER TABLE public.ai_message_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view audits in their workspace"
  ON public.ai_message_audit FOR SELECT
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Service can insert audits"
  ON public.ai_message_audit FOR INSERT
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 3. conversation_ai_state: Bot state per conversation
CREATE TABLE public.conversation_ai_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL UNIQUE,
  active_bot_id UUID NULL REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  is_bot_sleeping BOOLEAN NOT NULL DEFAULT false,
  sleep_until TIMESTAMPTZ NULL,
  fail_count INT NOT NULL DEFAULT 0,
  last_ai_message_at TIMESTAMPTZ NULL,
  handed_over BOOLEAN NOT NULL DEFAULT false,
  handed_over_to_user_id UUID NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_ai_state_workspace ON public.conversation_ai_state(workspace_id);
CREATE INDEX idx_conversation_ai_state_conversation ON public.conversation_ai_state(conversation_id);

ALTER TABLE public.conversation_ai_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view AI state in their workspace"
  ON public.conversation_ai_state FOR SELECT
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can manage AI state"
  ON public.conversation_ai_state FOR ALL
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 4. Add columns to conversation_sessions
ALTER TABLE public.conversation_sessions
  ADD COLUMN IF NOT EXISTS summary TEXT NULL,
  ADD COLUMN IF NOT EXISTS transcript TEXT NULL,
  ADD COLUMN IF NOT EXISTS saved_to_contact_field TEXT NULL,
  ADD COLUMN IF NOT EXISTS inactivity_threshold_minutes INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS session_end_at TIMESTAMPTZ NULL;

-- 5. Add goal_config to ai_agents
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS goal_config JSONB DEFAULT '{}';
