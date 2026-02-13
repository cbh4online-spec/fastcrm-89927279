
-- Add new fields to conversations table for Inbox 3.0
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS conversation_status_simplified TEXT DEFAULT 'REQUIRES_RESPONSE',
ADD COLUMN IF NOT EXISTS conversation_priority_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS potential_value_estimate NUMERIC DEFAULT 0;

-- Add check constraint for valid simplified statuses
ALTER TABLE public.conversations 
ADD CONSTRAINT chk_conversation_status_simplified 
CHECK (conversation_status_simplified IN ('REQUIRES_RESPONSE', 'FOLLOW_UP', 'RESOLVED', 'ACTIVE_OPPORTUNITY'));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_conv_priority_score ON public.conversations(workspace_id, conversation_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_conv_sla_deadline ON public.conversations(workspace_id, sla_deadline);
CREATE INDEX IF NOT EXISTS idx_conv_status_simplified ON public.conversations(workspace_id, conversation_status_simplified);

-- Conversation analytics cache table
CREATE TABLE IF NOT EXISTS public.conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  avg_response_time_minutes NUMERIC,
  sla_breached BOOLEAN DEFAULT false,
  ai_suggestions_used INTEGER DEFAULT 0,
  conversion_status TEXT,
  revenue NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id)
);

-- Enable RLS on conversation_analytics
ALTER TABLE public.conversation_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversation_analytics
CREATE POLICY "Users can view their workspace analytics"
ON public.conversation_analytics FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert their workspace analytics"
ON public.conversation_analytics FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their workspace analytics"
ON public.conversation_analytics FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));
