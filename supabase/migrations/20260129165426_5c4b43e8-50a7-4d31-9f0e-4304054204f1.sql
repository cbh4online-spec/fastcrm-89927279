-- Widget configurations table
CREATE TABLE public.widget_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Widget Principal',
  
  -- Appearance settings
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#f1f5f9',
  text_color TEXT DEFAULT '#1e293b',
  position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  bubble_icon TEXT DEFAULT 'message-circle',
  welcome_message TEXT DEFAULT 'Olá! Como posso ajudar?',
  placeholder_text TEXT DEFAULT 'Escreva a sua mensagem...',
  
  -- Behavior settings
  default_flow_id UUID REFERENCES public.conversational_flows(id) ON DELETE SET NULL,
  default_persona_id UUID REFERENCES public.ai_personas(id) ON DELETE SET NULL,
  knowledge_base_ids UUID[] DEFAULT '{}',
  auto_open_delay_ms INTEGER DEFAULT 0,
  require_email_before_chat BOOLEAN DEFAULT false,
  
  -- Branding
  show_branding BOOLEAN DEFAULT true,
  custom_css TEXT,
  avatar_url TEXT,
  company_name TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  allowed_domains TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Widget conversations (public, no auth required)
CREATE TABLE public.widget_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  widget_id UUID NOT NULL REFERENCES public.widget_configurations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Visitor info
  visitor_id TEXT NOT NULL,
  visitor_email TEXT,
  visitor_name TEXT,
  visitor_metadata JSONB DEFAULT '{}',
  
  -- Session tracking
  session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'transferred')),
  transferred_to_inbox_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Widget messages
CREATE TABLE public.widget_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.widget_conversations(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Metadata
  flow_step_id UUID REFERENCES public.flow_steps(id) ON DELETE SET NULL,
  collected_variable TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.widget_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for widget_configurations (workspace members only)
CREATE POLICY "Users can manage widget configs in their workspace"
  ON public.widget_configurations FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- RLS Policies for widget_conversations (workspace members can view)
CREATE POLICY "Users can view widget conversations in their workspace"
  ON public.widget_conversations FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Public insert for widget (anon users can create conversations)
CREATE POLICY "Anyone can create widget conversations"
  ON public.widget_conversations FOR INSERT
  WITH CHECK (true);

-- RLS Policies for widget_messages (workspace members can view)
CREATE POLICY "Users can view widget messages in their workspace"
  ON public.widget_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM widget_conversations 
    WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  ));

-- Public insert for messages (anon users can send messages)
CREATE POLICY "Anyone can insert widget messages"
  ON public.widget_messages FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_widget_configs_workspace ON public.widget_configurations(workspace_id);
CREATE INDEX idx_widget_conversations_widget ON public.widget_conversations(widget_id);
CREATE INDEX idx_widget_conversations_visitor ON public.widget_conversations(visitor_id);
CREATE INDEX idx_widget_messages_conversation ON public.widget_messages(conversation_id);

-- Trigger for updated_at
CREATE TRIGGER update_widget_configurations_updated_at
  BEFORE UPDATE ON public.widget_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_widget_conversations_updated_at
  BEFORE UPDATE ON public.widget_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();