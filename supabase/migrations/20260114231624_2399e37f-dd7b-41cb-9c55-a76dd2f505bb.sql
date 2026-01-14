-- Create table for follow-up tracking and suggestions
CREATE TABLE public.conversation_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Follow-up state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'snoozed', 'sent', 'dismissed', 'approved')),
  
  -- Timing
  hours_since_last_reply INTEGER NOT NULL,
  suggested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  snooze_until TIMESTAMP WITH TIME ZONE,
  
  -- Prepared message (automation)
  prepared_message TEXT,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  
  -- Approval flow
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_followups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view followups in their workspace"
ON public.conversation_followups
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can create followups in their workspace"
ON public.conversation_followups
FOR INSERT
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update followups in their workspace"
ON public.conversation_followups
FOR UPDATE
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can delete followups in their workspace"
ON public.conversation_followups
FOR DELETE
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Create trigger for updated_at
CREATE TRIGGER update_conversation_followups_updated_at
BEFORE UPDATE ON public.conversation_followups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast lookups
CREATE INDEX idx_followups_conversation ON public.conversation_followups(conversation_id);
CREATE INDEX idx_followups_status ON public.conversation_followups(status) WHERE status IN ('pending', 'snoozed');
CREATE INDEX idx_followups_workspace_status ON public.conversation_followups(workspace_id, status);