-- Add RLS policies for widget_configurations table

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view widget configs in their workspace" ON public.widget_configurations;
DROP POLICY IF EXISTS "Users can manage widget configs in their workspace" ON public.widget_configurations;
DROP POLICY IF EXISTS "Super admins can manage widget configs" ON public.widget_configurations;

-- Enable RLS
ALTER TABLE public.widget_configurations ENABLE ROW LEVEL SECURITY;

-- Super admin full access
CREATE POLICY "Super admins can manage widget configs"
ON public.widget_configurations
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Workspace members can view
CREATE POLICY "Users can view widget configs in their workspace"
ON public.widget_configurations
FOR SELECT
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

-- Workspace members can insert/update/delete
CREATE POLICY "Users can manage widget configs in their workspace"
ON public.widget_configurations
FOR ALL
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

-- Also add policies for widget_conversations and widget_messages for completeness
ALTER TABLE public.widget_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_messages ENABLE ROW LEVEL SECURITY;

-- Widget conversations policies
DROP POLICY IF EXISTS "Users can view widget conversations in their workspace" ON public.widget_conversations;
DROP POLICY IF EXISTS "Super admins can manage widget conversations" ON public.widget_conversations;
DROP POLICY IF EXISTS "Public can create widget conversations" ON public.widget_conversations;

CREATE POLICY "Super admins can manage widget conversations"
ON public.widget_conversations
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view widget conversations in their workspace"
ON public.widget_conversations
FOR SELECT
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

-- Allow anonymous inserts for widget conversations (visitors)
CREATE POLICY "Public can create widget conversations"
ON public.widget_conversations
FOR INSERT
WITH CHECK (true);

-- Widget messages policies
DROP POLICY IF EXISTS "Users can view widget messages" ON public.widget_messages;
DROP POLICY IF EXISTS "Super admins can manage widget messages" ON public.widget_messages;
DROP POLICY IF EXISTS "Public can create widget messages" ON public.widget_messages;

CREATE POLICY "Super admins can manage widget messages"
ON public.widget_messages
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view widget messages"
ON public.widget_messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT wc.id FROM widget_conversations wc
    WHERE wc.workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
);

-- Allow anonymous inserts for widget messages (visitors)
CREATE POLICY "Public can create widget messages"
ON public.widget_messages
FOR INSERT
WITH CHECK (true);