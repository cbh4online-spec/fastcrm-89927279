
-- Command Actions Registry
CREATE TABLE public.command_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  title TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'Navigate',
  keywords TEXT[] DEFAULT '{}',
  action_type TEXT NOT NULL DEFAULT 'navigate',
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, action_key)
);

ALTER TABLE public.command_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own workspace actions"
  ON public.command_actions FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own workspace actions"
  ON public.command_actions FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Command Conversations (persistent memory)
CREATE TABLE public.command_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  messages JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.command_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations"
  ON public.command_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations"
  ON public.command_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
  ON public.command_conversations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime for conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.command_conversations;
