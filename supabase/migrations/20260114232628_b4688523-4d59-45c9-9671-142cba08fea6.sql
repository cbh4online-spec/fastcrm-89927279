-- Create CRM activity timeline table to track all CRM-related activities
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Entity references (polymorphic)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'opportunity', 'contact', 'company', 'conversation')),
  entity_id UUID NOT NULL,
  
  -- Related entities for cross-referencing
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  
  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'message_sent', 'message_received', 
    'status_changed', 'stage_changed',
    'opportunity_created', 'opportunity_updated', 'opportunity_won', 'opportunity_lost',
    'lead_created', 'lead_updated', 'lead_contacted',
    'task_created', 'task_completed',
    'note_added', 'tag_added', 'tag_removed',
    'assigned', 'automation_triggered',
    'proposal_sent', 'proposal_viewed', 'proposal_accepted',
    'followup_scheduled', 'followup_completed',
    'custom'
  )),
  
  -- Activity metadata
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Attribution
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  automation_rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_crm_activities_workspace ON public.crm_activities(workspace_id);
CREATE INDEX idx_crm_activities_entity ON public.crm_activities(entity_type, entity_id);
CREATE INDEX idx_crm_activities_lead ON public.crm_activities(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_crm_activities_opportunity ON public.crm_activities(opportunity_id) WHERE opportunity_id IS NOT NULL;
CREATE INDEX idx_crm_activities_conversation ON public.crm_activities(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_crm_activities_created ON public.crm_activities(created_at DESC);
CREATE INDEX idx_crm_activities_type ON public.crm_activities(activity_type);

-- Enable RLS
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view activities in their workspace"
ON public.crm_activities FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create activities in their workspace"
ON public.crm_activities FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- Add last_contact_at column to leads table if not exists
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP WITH TIME ZONE;

-- Create function to update lead last_contact_at when message is sent/received
CREATE OR REPLACE FUNCTION public.update_lead_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Update lead's last_contact_at when a message is created
  UPDATE public.leads l
  SET 
    last_contact_at = NEW.sent_at,
    updated_at = now()
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id
    AND c.lead_id = l.id
    AND l.id IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS trigger_update_lead_last_contact ON public.messages;
CREATE TRIGGER trigger_update_lead_last_contact
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_lead_last_contact();

-- Create function to log message activities automatically
CREATE OR REPLACE FUNCTION public.log_message_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id UUID;
  v_lead_name TEXT;
BEGIN
  -- Get the lead_id from the conversation
  SELECT c.lead_id, l.name INTO v_lead_id, v_lead_name
  FROM public.conversations c
  LEFT JOIN public.leads l ON c.lead_id = l.id
  WHERE c.id = NEW.conversation_id;
  
  -- Insert activity log
  INSERT INTO public.crm_activities (
    workspace_id,
    entity_type,
    entity_id,
    lead_id,
    conversation_id,
    activity_type,
    title,
    description,
    metadata,
    performed_by
  ) VALUES (
    NEW.workspace_id,
    'conversation',
    NEW.conversation_id,
    v_lead_id,
    NEW.conversation_id,
    CASE WHEN NEW.direction = 'inbound' THEN 'message_received' ELSE 'message_sent' END,
    CASE 
      WHEN NEW.direction = 'inbound' THEN 'Mensagem recebida de ' || COALESCE(v_lead_name, 'cliente')
      ELSE 'Mensagem enviada para ' || COALESCE(v_lead_name, 'cliente')
    END,
    LEFT(NEW.content, 200),
    jsonb_build_object(
      'message_id', NEW.id,
      'direction', NEW.direction,
      'content_preview', LEFT(NEW.content, 100)
    ),
    NEW.sender_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to log messages as activities
DROP TRIGGER IF EXISTS trigger_log_message_activity ON public.messages;
CREATE TRIGGER trigger_log_message_activity
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.log_message_activity();

-- Create function to log lead status changes
CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.crm_activities (
      workspace_id,
      entity_type,
      entity_id,
      lead_id,
      activity_type,
      title,
      description,
      metadata,
      performed_by
    ) VALUES (
      NEW.workspace_id,
      'lead',
      NEW.id,
      NEW.id,
      'status_changed',
      'Status do lead alterado para ' || NEW.status,
      'Status alterado de "' || COALESCE(OLD.status, 'nenhum') || '" para "' || NEW.status || '"',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for lead status changes
DROP TRIGGER IF EXISTS trigger_log_lead_status_change ON public.leads;
CREATE TRIGGER trigger_log_lead_status_change
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_status_change();

-- Create function to log opportunity changes
CREATE OR REPLACE FUNCTION public.log_opportunity_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_activity_type TEXT;
  v_title TEXT;
  v_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_activity_type := 'opportunity_created';
    v_title := 'Oportunidade criada: ' || NEW.title;
    v_description := 'Nova oportunidade criada com valor de €' || COALESCE(NEW.value::text, '0');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'won' THEN
        v_activity_type := 'opportunity_won';
        v_title := 'Oportunidade ganha: ' || NEW.title;
        v_description := 'Oportunidade marcada como ganha. Valor: €' || COALESCE(NEW.value::text, '0');
      ELSIF NEW.status = 'lost' THEN
        v_activity_type := 'opportunity_lost';
        v_title := 'Oportunidade perdida: ' || NEW.title;
        v_description := 'Motivo: ' || COALESCE(NEW.lost_reason, 'Não especificado');
      ELSE
        v_activity_type := 'opportunity_updated';
        v_title := 'Oportunidade atualizada: ' || NEW.title;
        v_description := 'Status alterado para ' || NEW.status;
      END IF;
    ELSIF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      v_activity_type := 'stage_changed';
      v_title := 'Fase da oportunidade alterada: ' || NEW.title;
      v_description := 'Oportunidade movida para nova fase';
    ELSE
      v_activity_type := 'opportunity_updated';
      v_title := 'Oportunidade atualizada: ' || NEW.title;
      v_description := NULL;
    END IF;
  ELSE
    RETURN NULL;
  END IF;
  
  INSERT INTO public.crm_activities (
    workspace_id,
    entity_type,
    entity_id,
    lead_id,
    opportunity_id,
    activity_type,
    title,
    description,
    metadata,
    performed_by
  ) VALUES (
    NEW.workspace_id,
    'opportunity',
    NEW.id,
    NEW.lead_id,
    NEW.id,
    v_activity_type,
    v_title,
    v_description,
    jsonb_build_object(
      'title', NEW.title,
      'value', NEW.value,
      'status', NEW.status,
      'stage_id', NEW.stage_id
    ),
    auth.uid()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for opportunity changes
DROP TRIGGER IF EXISTS trigger_log_opportunity_insert ON public.opportunities;
CREATE TRIGGER trigger_log_opportunity_insert
AFTER INSERT ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.log_opportunity_activity();

DROP TRIGGER IF EXISTS trigger_log_opportunity_update ON public.opportunities;
CREATE TRIGGER trigger_log_opportunity_update
AFTER UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.log_opportunity_activity();

-- Enable realtime for activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_activities;