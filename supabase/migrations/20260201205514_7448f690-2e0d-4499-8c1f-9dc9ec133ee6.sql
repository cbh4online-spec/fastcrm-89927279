-- Create AI Agents table for multi-platform support
CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('widget', 'whatsapp', 'instagram', 'facebook', 'email', 'sms', 'live_chat')),
  persona_id UUID REFERENCES ai_personas(id) ON DELETE SET NULL,
  knowledge_base_ids UUID[] DEFAULT '{}',
  flow_id UUID REFERENCES conversational_flows(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by workspace and channel
CREATE INDEX idx_ai_agents_workspace_channel 
  ON public.ai_agents(workspace_id, channel) WHERE is_active = true;

-- Index for workspace lookup
CREATE INDEX idx_ai_agents_workspace_id ON public.ai_agents(workspace_id);

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Members can view agents in their workspace
CREATE POLICY "Members can view agents" ON public.ai_agents
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- RLS Policy: Admins can insert agents
CREATE POLICY "Admins can insert agents" ON public.ai_agents
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
    OR public.is_super_admin(auth.uid())
  );

-- RLS Policy: Admins can update agents
CREATE POLICY "Admins can update agents" ON public.ai_agents
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
    OR public.is_super_admin(auth.uid())
  );

-- RLS Policy: Admins can delete agents
CREATE POLICY "Admins can delete agents" ON public.ai_agents
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
    OR public.is_super_admin(auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();