-- Create smart alerts table
CREATE TABLE public.inbox_smart_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  
  alert_type TEXT NOT NULL, -- 'hot_no_reply', 'proposal_multi_view', 'client_inactive', 'opportunity_stalled', etc.
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_label TEXT, -- e.g., "Responder agora", "Ver proposta"
  action_url TEXT, -- Link to take action
  
  context_data JSONB DEFAULT '{}', -- Extra context like view count, days inactive, etc.
  
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  is_actioned BOOLEAN DEFAULT FALSE,
  actioned_at TIMESTAMP WITH TIME ZONE,
  actioned_by UUID,
  
  expires_at TIMESTAMP WITH TIME ZONE, -- Auto-dismiss after this time
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inbox_smart_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view alerts in their workspace"
ON public.inbox_smart_alerts FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update alerts in their workspace"
ON public.inbox_smart_alerts FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert alerts in their workspace"
ON public.inbox_smart_alerts FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete alerts in their workspace"
ON public.inbox_smart_alerts FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Index for faster queries
CREATE INDEX idx_inbox_smart_alerts_workspace ON public.inbox_smart_alerts(workspace_id);
CREATE INDEX idx_inbox_smart_alerts_active ON public.inbox_smart_alerts(workspace_id, is_dismissed, is_actioned) WHERE is_dismissed = FALSE AND is_actioned = FALSE;
CREATE INDEX idx_inbox_smart_alerts_conversation ON public.inbox_smart_alerts(conversation_id) WHERE conversation_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_inbox_smart_alerts_updated_at
BEFORE UPDATE ON public.inbox_smart_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();