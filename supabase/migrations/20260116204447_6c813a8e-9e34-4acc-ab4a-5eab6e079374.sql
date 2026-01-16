
-- Add outcome fields to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('successful', 'needs_followup', 'no_show', 'cancelled', 'rescheduled')),
ADD COLUMN IF NOT EXISTS outcome_notes TEXT,
ADD COLUMN IF NOT EXISTS next_steps TEXT,
ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS follow_up_task_id UUID,
ADD COLUMN IF NOT EXISTS crm_activity_id UUID;

-- Meeting outcomes/notes history
CREATE TABLE public.meeting_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general' CHECK (note_type IN ('general', 'action_item', 'decision', 'question')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Internal activity feed for users (for internal meetings)
CREATE TABLE public.user_activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false, -- If true, visible to team
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_feed ENABLE ROW LEVEL SECURITY;

-- RLS for meeting_notes
CREATE POLICY "Users can view notes in their workspace"
  ON public.meeting_notes FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can create notes"
  ON public.meeting_notes FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Users can update their own notes"
  ON public.meeting_notes FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own notes"
  ON public.meeting_notes FOR DELETE
  USING (auth.uid() = created_by);

-- RLS for user_activity_feed
CREATE POLICY "Users can view their own activities"
  ON public.user_activity_feed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public team activities"
  ON public.user_activity_feed FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND is_public = true);

CREATE POLICY "Users can create their own activities"
  ON public.user_activity_feed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_meeting_notes_meeting ON public.meeting_notes(meeting_id);
CREATE INDEX idx_user_activity_feed_user ON public.user_activity_feed(user_id);
CREATE INDEX idx_user_activity_feed_workspace ON public.user_activity_feed(workspace_id);
CREATE INDEX idx_meetings_category ON public.meetings(category);
CREATE INDEX idx_meetings_outcome ON public.meetings(outcome);

-- Function to log client meeting to CRM activities
CREATE OR REPLACE FUNCTION public.log_client_meeting_to_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_activity_type TEXT;
  v_title TEXT;
  v_description TEXT;
  v_activity_id UUID;
BEGIN
  -- Only process client or hybrid meetings
  IF NEW.category NOT IN ('client', 'hybrid') THEN
    RETURN NEW;
  END IF;

  -- Determine activity type and content based on status/outcome
  IF TG_OP = 'INSERT' THEN
    v_activity_type := 'meeting_scheduled';
    v_title := 'Reunião agendada: ' || NEW.title;
    v_description := format('Reunião marcada para %s', to_char(NEW.start_time, 'DD/MM/YYYY HH24:MI'));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      CASE NEW.status
        WHEN 'confirmed' THEN
          v_activity_type := 'meeting_confirmed';
          v_title := 'Reunião confirmada: ' || NEW.title;
          v_description := 'O cliente confirmou a reunião';
        WHEN 'completed' THEN
          v_activity_type := 'meeting_completed';
          v_title := 'Reunião concluída: ' || NEW.title;
          v_description := COALESCE(NEW.outcome_notes, 'Reunião realizada com sucesso');
        WHEN 'cancelled' THEN
          v_activity_type := 'meeting_cancelled';
          v_title := 'Reunião cancelada: ' || NEW.title;
          v_description := COALESCE(NEW.cancellation_reason, 'Reunião foi cancelada');
        WHEN 'no_show' THEN
          v_activity_type := 'meeting_no_show';
          v_title := 'No-show: ' || NEW.title;
          v_description := 'O cliente não compareceu à reunião';
        ELSE
          RETURN NEW;
      END CASE;
    ELSIF OLD.outcome IS DISTINCT FROM NEW.outcome AND NEW.outcome IS NOT NULL THEN
      v_activity_type := 'meeting_outcome';
      v_title := 'Resultado da reunião: ' || NEW.title;
      v_description := CASE NEW.outcome
        WHEN 'successful' THEN 'Reunião bem sucedida'
        WHEN 'needs_followup' THEN 'Necessita follow-up'
        WHEN 'rescheduled' THEN 'Reunião reagendada'
        ELSE NEW.outcome
      END || COALESCE('. ' || NEW.outcome_notes, '');
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Insert CRM activity
  INSERT INTO public.crm_activities (
    workspace_id,
    entity_type,
    entity_id,
    lead_id,
    contact_id,
    company_id,
    activity_type,
    title,
    description,
    metadata,
    performed_by
  ) VALUES (
    NEW.workspace_id,
    'meeting',
    NEW.id,
    NEW.lead_id,
    NEW.contact_id,
    NEW.company_id,
    v_activity_type,
    v_title,
    v_description,
    jsonb_build_object(
      'meeting_id', NEW.id,
      'meeting_category', NEW.category,
      'meeting_mode', NEW.mode,
      'start_time', NEW.start_time,
      'end_time', NEW.end_time,
      'status', NEW.status,
      'outcome', NEW.outcome
    ),
    COALESCE(NEW.created_by, auth.uid())
  )
  RETURNING id INTO v_activity_id;

  -- Update meeting with activity reference
  IF v_activity_id IS NOT NULL THEN
    UPDATE public.meetings SET crm_activity_id = v_activity_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to log internal meeting to user activity feed
CREATE OR REPLACE FUNCTION public.log_internal_meeting_to_feed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process internal meetings
  IF NEW.category != 'internal' THEN
    RETURN NEW;
  END IF;

  -- Log to user activity feed
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_activity_feed (
      workspace_id,
      user_id,
      activity_type,
      title,
      description,
      entity_type,
      entity_id,
      metadata,
      is_public
    ) VALUES (
      NEW.workspace_id,
      NEW.created_by,
      'meeting_created',
      'Reunião interna criada: ' || NEW.title,
      format('Agendada para %s', to_char(NEW.start_time, 'DD/MM/YYYY HH24:MI')),
      'meeting',
      NEW.id,
      jsonb_build_object(
        'meeting_mode', NEW.mode,
        'start_time', NEW.start_time,
        'duration_minutes', NEW.duration_minutes
      ),
      false -- Not public by default
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.user_activity_feed (
      workspace_id,
      user_id,
      activity_type,
      title,
      description,
      entity_type,
      entity_id,
      metadata,
      is_public
    ) VALUES (
      NEW.workspace_id,
      NEW.created_by,
      'meeting_' || NEW.status,
      CASE NEW.status
        WHEN 'completed' THEN 'Reunião interna concluída: ' || NEW.title
        WHEN 'cancelled' THEN 'Reunião interna cancelada: ' || NEW.title
        ELSE 'Reunião interna atualizada: ' || NEW.title
      END,
      NEW.outcome_notes,
      'meeting',
      NEW.id,
      jsonb_build_object(
        'status', NEW.status,
        'outcome', NEW.outcome
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers
CREATE TRIGGER log_client_meeting_crm
  AFTER INSERT OR UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_client_meeting_to_crm();

CREATE TRIGGER log_internal_meeting_feed
  AFTER INSERT OR UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_internal_meeting_to_feed();

-- Function to create follow-up task from meeting
CREATE OR REPLACE FUNCTION public.create_meeting_followup_task(
  p_meeting_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_meeting RECORD;
  v_task_id UUID;
BEGIN
  SELECT * INTO v_meeting FROM meetings WHERE id = p_meeting_id;
  
  IF v_meeting IS NULL THEN
    RAISE EXCEPTION 'Meeting not found';
  END IF;
  
  -- Insert into tasks table (assuming it exists, otherwise create activity)
  INSERT INTO public.crm_activities (
    workspace_id,
    entity_type,
    entity_id,
    lead_id,
    contact_id,
    company_id,
    activity_type,
    title,
    description,
    scheduled_at,
    metadata,
    performed_by
  ) VALUES (
    v_meeting.workspace_id,
    'task',
    p_meeting_id,
    v_meeting.lead_id,
    v_meeting.contact_id,
    v_meeting.company_id,
    'follow_up_task',
    p_title,
    COALESCE(p_description, 'Tarefa de follow-up da reunião: ' || v_meeting.title),
    COALESCE(p_due_date, v_meeting.follow_up_date, now() + interval '1 day'),
    jsonb_build_object(
      'source_meeting_id', p_meeting_id,
      'source_meeting_title', v_meeting.title
    ),
    auth.uid()
  )
  RETURNING id INTO v_task_id;
  
  -- Update meeting with task reference
  UPDATE meetings SET follow_up_task_id = v_task_id WHERE id = p_meeting_id;
  
  RETURN v_task_id;
END;
$$;
