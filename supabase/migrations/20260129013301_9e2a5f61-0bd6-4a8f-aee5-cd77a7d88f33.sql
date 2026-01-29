-- Create entity_activities table for timeline/activity feed
CREATE TABLE public.entity_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'company', 'opportunity')),
  entity_id UUID NOT NULL,
  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'created', 'updated', 'status_change', 'stage_change',
    'note_added', 'task_created', 'task_completed',
    'email_sent', 'email_received', 'call_made', 'call_received',
    'meeting_scheduled', 'meeting_completed',
    'opportunity_created', 'opportunity_won', 'opportunity_lost',
    'invoice_sent', 'invoice_paid',
    'document_uploaded', 'proposal_sent', 'proposal_viewed',
    'tag_added', 'tag_removed', 'assigned', 'custom'
  )),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Reference to related item
  related_type TEXT,
  related_id UUID,
  -- Tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_entity_activities_entity ON public.entity_activities(entity_type, entity_id);
CREATE INDEX idx_entity_activities_workspace ON public.entity_activities(workspace_id);
CREATE INDEX idx_entity_activities_created ON public.entity_activities(created_at DESC);
CREATE INDEX idx_entity_activities_type ON public.entity_activities(activity_type);

-- Enable RLS
ALTER TABLE public.entity_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view activities in their workspace"
ON public.entity_activities FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create activities in their workspace"
ON public.entity_activities FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete activities in their workspace"
ON public.entity_activities FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- Function to auto-log entity creation
CREATE OR REPLACE FUNCTION public.log_entity_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.entity_activities (
    workspace_id,
    entity_type,
    entity_id,
    activity_type,
    title,
    description,
    created_by
  ) VALUES (
    NEW.workspace_id,
    TG_ARGV[0],
    NEW.id,
    'created',
    'Registo criado',
    'Novo ' || TG_ARGV[0] || ' criado: ' || NEW.name,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

-- Create triggers for auto-logging
CREATE TRIGGER log_lead_creation
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_entity_creation('lead');

CREATE TRIGGER log_contact_creation
AFTER INSERT ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.log_entity_creation('contact');

CREATE TRIGGER log_company_creation
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.log_entity_creation('company');