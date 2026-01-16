
-- Meeting types configuration
CREATE TABLE public.meeting_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'client' CHECK (category IN ('client', 'internal', 'hybrid')),
  mode TEXT NOT NULL DEFAULT 'online' CHECK (mode IN ('online', 'in_person', 'phone', 'whatsapp')),
  default_duration INTEGER NOT NULL DEFAULT 60,
  buffer_before INTEGER DEFAULT 0,
  buffer_after INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'calendar',
  -- Meeting provider settings
  meeting_provider TEXT CHECK (meeting_provider IN ('zoom', 'google_meet', 'custom', 'none')),
  custom_meeting_link TEXT,
  -- Booking rules
  min_notice_hours INTEGER DEFAULT 24,
  max_advance_days INTEGER DEFAULT 60,
  daily_limit INTEGER,
  weekly_limit INTEGER,
  -- Availability windows (JSONB array of {day, start_time, end_time})
  availability_windows JSONB DEFAULT '[]',
  -- Required fields based on category
  require_contact BOOLEAN DEFAULT false,
  require_company BOOLEAN DEFAULT false,
  require_opportunity BOOLEAN DEFAULT false,
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  public_slug TEXT UNIQUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meetings/bookings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE SET NULL,
  meeting_type_id UUID REFERENCES public.meeting_types(id) ON DELETE SET NULL,
  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'client' CHECK (category IN ('client', 'internal', 'hybrid')),
  mode TEXT NOT NULL DEFAULT 'online' CHECK (mode IN ('online', 'in_person', 'phone', 'whatsapp')),
  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT DEFAULT 'Europe/Lisbon',
  buffer_before INTEGER DEFAULT 0,
  buffer_after INTEGER DEFAULT 0,
  -- Location/Meeting details
  location TEXT,
  meeting_url TEXT,
  meeting_provider TEXT CHECK (meeting_provider IN ('zoom', 'google_meet', 'custom', 'none')),
  phone_number TEXT,
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show', 'completed')),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID,
  cancellation_reason TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  -- Client associations (for client/hybrid meetings)
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  -- Booking metadata
  booked_by UUID,
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'booking_page', 'calendar_sync', 'automation')),
  external_id TEXT,
  -- Notes and follow-up
  internal_notes TEXT,
  client_notes TEXT,
  outcome TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  -- Reminders
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting attendees
CREATE TABLE public.meeting_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  -- Can be either a user or external attendee
  user_id UUID,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  -- External attendee info (when not in system)
  external_name TEXT,
  external_email TEXT,
  external_phone TEXT,
  -- Role in meeting
  role TEXT DEFAULT 'attendee' CHECK (role IN ('organizer', 'host', 'attendee', 'optional')),
  -- Response
  response_status TEXT DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),
  responded_at TIMESTAMP WITH TIME ZONE,
  -- Attendance
  attended BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  -- Notifications
  notification_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting resources (rooms, equipment, etc.)
CREATE TABLE public.meeting_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL DEFAULT 'room' CHECK (resource_type IN ('room', 'equipment', 'vehicle', 'other')),
  capacity INTEGER,
  location TEXT,
  amenities JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting resource bookings
CREATE TABLE public.meeting_resource_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.meeting_resources(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, resource_id)
);

-- Meeting rules/settings per workspace
CREATE TABLE public.meeting_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  -- Global settings
  default_timezone TEXT DEFAULT 'Europe/Lisbon',
  default_buffer_before INTEGER DEFAULT 5,
  default_buffer_after INTEGER DEFAULT 5,
  default_duration INTEGER DEFAULT 60,
  -- Limits
  global_daily_limit INTEGER,
  global_weekly_limit INTEGER,
  -- Booking rules
  min_notice_hours INTEGER DEFAULT 24,
  max_advance_days INTEGER DEFAULT 60,
  allow_same_day_booking BOOLEAN DEFAULT false,
  -- Working hours (JSONB)
  working_hours JSONB DEFAULT '[
    {"day": 1, "start": "09:00", "end": "18:00"},
    {"day": 2, "start": "09:00", "end": "18:00"},
    {"day": 3, "start": "09:00", "end": "18:00"},
    {"day": 4, "start": "09:00", "end": "18:00"},
    {"day": 5, "start": "09:00", "end": "18:00"}
  ]',
  -- Blocked dates
  blocked_dates JSONB DEFAULT '[]',
  -- Notifications
  send_confirmations BOOLEAN DEFAULT true,
  send_reminders BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER DEFAULT 24,
  -- Integration settings
  auto_create_calendar_event BOOLEAN DEFAULT true,
  sync_with_google_calendar BOOLEAN DEFAULT false,
  sync_with_outlook BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting templates for quick creation
CREATE TABLE public.meeting_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  meeting_type_id UUID REFERENCES public.meeting_types(id) ON DELETE SET NULL,
  default_title TEXT,
  default_description TEXT,
  default_duration INTEGER DEFAULT 60,
  default_mode TEXT DEFAULT 'online',
  agenda_template TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.meeting_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_resource_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_types
CREATE POLICY "Users can view meeting types in their workspace"
ON public.meeting_types FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage meeting types in their workspace"
ON public.meeting_types FOR ALL
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS Policies for meetings
CREATE POLICY "Users can view meetings in their workspace"
ON public.meetings FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create meetings in their workspace"
ON public.meetings FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update meetings in their workspace"
ON public.meetings FOR UPDATE
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own meetings"
ON public.meetings FOR DELETE
USING (created_by = auth.uid() OR workspace_id IN (
  SELECT workspace_id FROM public.workspace_members 
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
));

-- RLS Policies for meeting_attendees
CREATE POLICY "Users can view attendees for accessible meetings"
ON public.meeting_attendees FOR SELECT
USING (meeting_id IN (SELECT id FROM public.meetings WHERE workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
)));

CREATE POLICY "Users can manage attendees for accessible meetings"
ON public.meeting_attendees FOR ALL
USING (meeting_id IN (SELECT id FROM public.meetings WHERE workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
)));

-- RLS Policies for meeting_resources
CREATE POLICY "Users can view resources in their workspace"
ON public.meeting_resources FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage resources"
ON public.meeting_resources FOR ALL
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members 
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
));

-- RLS Policies for meeting_resource_bookings
CREATE POLICY "Users can view resource bookings for accessible meetings"
ON public.meeting_resource_bookings FOR SELECT
USING (meeting_id IN (SELECT id FROM public.meetings WHERE workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
)));

CREATE POLICY "Users can manage resource bookings for their meetings"
ON public.meeting_resource_bookings FOR ALL
USING (meeting_id IN (SELECT id FROM public.meetings WHERE workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
)));

-- RLS Policies for meeting_settings
CREATE POLICY "Users can view meeting settings in their workspace"
ON public.meeting_settings FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage meeting settings"
ON public.meeting_settings FOR ALL
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members 
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
));

-- RLS Policies for meeting_templates
CREATE POLICY "Users can view templates in their workspace"
ON public.meeting_templates FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage templates in their workspace"
ON public.meeting_templates FOR ALL
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_meetings_workspace ON public.meetings(workspace_id);
CREATE INDEX idx_meetings_calendar ON public.meetings(calendar_id);
CREATE INDEX idx_meetings_start_time ON public.meetings(start_time);
CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_meetings_contact ON public.meetings(contact_id);
CREATE INDEX idx_meetings_company ON public.meetings(company_id);
CREATE INDEX idx_meetings_opportunity ON public.meetings(opportunity_id);
CREATE INDEX idx_meeting_attendees_meeting ON public.meeting_attendees(meeting_id);
CREATE INDEX idx_meeting_attendees_user ON public.meeting_attendees(user_id);
CREATE INDEX idx_meeting_types_workspace ON public.meeting_types(workspace_id);

-- Triggers for updated_at
CREATE TRIGGER update_meeting_types_updated_at
  BEFORE UPDATE ON public.meeting_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_resources_updated_at
  BEFORE UPDATE ON public.meeting_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_settings_updated_at
  BEFORE UPDATE ON public.meeting_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_templates_updated_at
  BEFORE UPDATE ON public.meeting_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check meeting conflicts
CREATE OR REPLACE FUNCTION public.check_meeting_conflicts(
  p_workspace_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_user_ids UUID[] DEFAULT NULL,
  p_resource_ids UUID[] DEFAULT NULL,
  p_exclude_meeting_id UUID DEFAULT NULL
)
RETURNS TABLE(
  conflict_type TEXT,
  conflict_id UUID,
  conflict_title TEXT,
  conflict_start TIMESTAMP WITH TIME ZONE,
  conflict_end TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check user conflicts
  IF p_user_ids IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      'user'::TEXT as conflict_type,
      m.id as conflict_id,
      m.title as conflict_title,
      m.start_time as conflict_start,
      m.end_time as conflict_end
    FROM meetings m
    JOIN meeting_attendees ma ON ma.meeting_id = m.id
    WHERE m.workspace_id = p_workspace_id
      AND m.status NOT IN ('cancelled')
      AND ma.user_id = ANY(p_user_ids)
      AND (m.id != p_exclude_meeting_id OR p_exclude_meeting_id IS NULL)
      AND (m.start_time, m.end_time) OVERLAPS (p_start_time, p_end_time);
  END IF;
  
  -- Check resource conflicts
  IF p_resource_ids IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      'resource'::TEXT as conflict_type,
      m.id as conflict_id,
      m.title as conflict_title,
      m.start_time as conflict_start,
      m.end_time as conflict_end
    FROM meetings m
    JOIN meeting_resource_bookings mrb ON mrb.meeting_id = m.id
    WHERE m.workspace_id = p_workspace_id
      AND m.status NOT IN ('cancelled')
      AND mrb.resource_id = ANY(p_resource_ids)
      AND (m.id != p_exclude_meeting_id OR p_exclude_meeting_id IS NULL)
      AND (m.start_time, m.end_time) OVERLAPS (p_start_time, p_end_time);
  END IF;
END;
$$;

-- Function to get available slots
CREATE OR REPLACE FUNCTION public.get_available_meeting_slots(
  p_workspace_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 60,
  p_user_ids UUID[] DEFAULT NULL,
  p_meeting_type_id UUID DEFAULT NULL
)
RETURNS TABLE(
  slot_start TIMESTAMP WITH TIME ZONE,
  slot_end TIMESTAMP WITH TIME ZONE,
  is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settings RECORD;
  v_working_hours JSONB;
  v_day_of_week INTEGER;
  v_start_time TIME;
  v_end_time TIME;
  v_slot_start TIMESTAMP WITH TIME ZONE;
  v_slot_end TIMESTAMP WITH TIME ZONE;
  v_buffer_before INTEGER;
  v_buffer_after INTEGER;
BEGIN
  -- Get workspace settings
  SELECT * INTO v_settings FROM meeting_settings WHERE workspace_id = p_workspace_id;
  
  IF v_settings IS NULL THEN
    v_working_hours := '[{"day": 1, "start": "09:00", "end": "18:00"},{"day": 2, "start": "09:00", "end": "18:00"},{"day": 3, "start": "09:00", "end": "18:00"},{"day": 4, "start": "09:00", "end": "18:00"},{"day": 5, "start": "09:00", "end": "18:00"}]';
    v_buffer_before := 5;
    v_buffer_after := 5;
  ELSE
    v_working_hours := v_settings.working_hours;
    v_buffer_before := COALESCE(v_settings.default_buffer_before, 5);
    v_buffer_after := COALESCE(v_settings.default_buffer_after, 5);
  END IF;
  
  -- Get meeting type specific buffers if provided
  IF p_meeting_type_id IS NOT NULL THEN
    SELECT COALESCE(buffer_before, v_buffer_before), COALESCE(buffer_after, v_buffer_after)
    INTO v_buffer_before, v_buffer_after
    FROM meeting_types WHERE id = p_meeting_type_id;
  END IF;
  
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
  IF v_day_of_week = 0 THEN v_day_of_week := 7; END IF;
  
  -- Get working hours for this day
  SELECT (wh->>'start')::TIME, (wh->>'end')::TIME
  INTO v_start_time, v_end_time
  FROM jsonb_array_elements(v_working_hours) wh
  WHERE (wh->>'day')::INTEGER = v_day_of_week;
  
  IF v_start_time IS NULL THEN
    RETURN;
  END IF;
  
  -- Generate slots
  v_slot_start := p_date + v_start_time;
  
  WHILE v_slot_start + (p_duration_minutes || ' minutes')::INTERVAL <= p_date + v_end_time LOOP
    v_slot_end := v_slot_start + (p_duration_minutes || ' minutes')::INTERVAL;
    
    RETURN QUERY
    SELECT 
      v_slot_start,
      v_slot_end,
      NOT EXISTS (
        SELECT 1 FROM check_meeting_conflicts(
          p_workspace_id,
          v_slot_start - (v_buffer_before || ' minutes')::INTERVAL,
          v_slot_end + (v_buffer_after || ' minutes')::INTERVAL,
          p_user_ids,
          NULL,
          NULL
        )
      );
    
    v_slot_start := v_slot_start + '30 minutes'::INTERVAL;
  END LOOP;
END;
$$;
