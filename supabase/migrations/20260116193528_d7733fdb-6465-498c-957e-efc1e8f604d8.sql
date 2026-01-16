
-- Create calendar groups/tags table
CREATE TABLE public.calendar_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'calendar',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendars table
CREATE TABLE public.calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  calendar_type TEXT NOT NULL DEFAULT 'internal' CHECK (calendar_type IN ('client', 'internal', 'event')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  group_id UUID REFERENCES public.calendar_groups(id) ON DELETE SET NULL,
  color TEXT DEFAULT '#3B82F6',
  timezone TEXT DEFAULT 'Europe/Lisbon',
  default_duration INTEGER DEFAULT 60,
  buffer_before INTEGER DEFAULT 0,
  buffer_after INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendar permissions table
CREATE TABLE public.calendar_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  user_id UUID,
  team_id UUID,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'edit', 'book', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(calendar_id, user_id, permission_type),
  UNIQUE(calendar_id, team_id, permission_type)
);

-- Create calendar user assignments
CREATE TABLE public.calendar_user_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(calendar_id, user_id)
);

-- Create calendar team assignments
CREATE TABLE public.calendar_team_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(calendar_id, team_id)
);

-- Create calendar service assignments
CREATE TABLE public.calendar_service_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  service_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(calendar_id, service_id)
);

-- Create calendar events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  meeting_url TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('tentative', 'confirmed', 'cancelled')),
  recurrence_rule TEXT,
  recurrence_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  attendees JSONB DEFAULT '[]',
  reminders JSONB DEFAULT '[{"type": "notification", "minutes": 15}]',
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_service_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_groups
CREATE POLICY "Users can view calendar groups in their workspace"
ON public.calendar_groups FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can manage calendar groups in their workspace"
ON public.calendar_groups FOR ALL
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- RLS Policies for calendars
CREATE POLICY "Users can view calendars they have access to"
ON public.calendars FOR SELECT
USING (
  workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  AND (
    is_public = true
    OR created_by = auth.uid()
    OR id IN (SELECT calendar_id FROM public.calendar_user_assignments WHERE user_id = auth.uid())
    OR id IN (SELECT calendar_id FROM public.calendar_permissions WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can create calendars in their workspace"
ON public.calendars FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update calendars they own or have admin permission"
ON public.calendars FOR UPDATE
USING (
  created_by = auth.uid()
  OR id IN (SELECT calendar_id FROM public.calendar_permissions WHERE user_id = auth.uid() AND permission_type = 'admin')
);

CREATE POLICY "Users can delete calendars they own"
ON public.calendars FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for calendar_permissions
CREATE POLICY "Users can view permissions for accessible calendars"
ON public.calendar_permissions FOR SELECT
USING (calendar_id IN (
  SELECT id FROM public.calendars WHERE created_by = auth.uid()
  OR calendar_id IN (SELECT calendar_id FROM public.calendar_permissions WHERE user_id = auth.uid() AND permission_type = 'admin')
));

CREATE POLICY "Calendar owners can manage permissions"
ON public.calendar_permissions FOR ALL
USING (calendar_id IN (
  SELECT id FROM public.calendars WHERE created_by = auth.uid()
));

-- RLS Policies for calendar_user_assignments
CREATE POLICY "Users can view user assignments"
ON public.calendar_user_assignments FOR SELECT
USING (calendar_id IN (SELECT id FROM public.calendars WHERE workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
)));

CREATE POLICY "Calendar owners can manage user assignments"
ON public.calendar_user_assignments FOR ALL
USING (calendar_id IN (SELECT id FROM public.calendars WHERE created_by = auth.uid()));

-- RLS Policies for calendar_team_assignments
CREATE POLICY "Users can view team assignments"
ON public.calendar_team_assignments FOR SELECT
USING (calendar_id IN (SELECT id FROM public.calendars WHERE workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
)));

CREATE POLICY "Calendar owners can manage team assignments"
ON public.calendar_team_assignments FOR ALL
USING (calendar_id IN (SELECT id FROM public.calendars WHERE created_by = auth.uid()));

-- RLS Policies for calendar_service_assignments
CREATE POLICY "Users can view service assignments"
ON public.calendar_service_assignments FOR SELECT
USING (calendar_id IN (SELECT id FROM public.calendars WHERE workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
)));

CREATE POLICY "Calendar owners can manage service assignments"
ON public.calendar_service_assignments FOR ALL
USING (calendar_id IN (SELECT id FROM public.calendars WHERE created_by = auth.uid()));

-- RLS Policies for calendar_events
CREATE POLICY "Users can view events in accessible calendars"
ON public.calendar_events FOR SELECT
USING (
  calendar_id IN (
    SELECT id FROM public.calendars WHERE 
      is_public = true
      OR created_by = auth.uid()
      OR id IN (SELECT calendar_id FROM public.calendar_user_assignments WHERE user_id = auth.uid())
      OR id IN (SELECT calendar_id FROM public.calendar_permissions WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can create events in calendars with book/edit/admin permission"
ON public.calendar_events FOR INSERT
WITH CHECK (
  calendar_id IN (
    SELECT id FROM public.calendars WHERE created_by = auth.uid()
    UNION
    SELECT calendar_id FROM public.calendar_permissions 
    WHERE user_id = auth.uid() AND permission_type IN ('book', 'edit', 'admin')
  )
);

CREATE POLICY "Users can update their own events or with edit/admin permission"
ON public.calendar_events FOR UPDATE
USING (
  created_by = auth.uid()
  OR calendar_id IN (
    SELECT calendar_id FROM public.calendar_permissions 
    WHERE user_id = auth.uid() AND permission_type IN ('edit', 'admin')
  )
);

CREATE POLICY "Users can delete their own events or with admin permission"
ON public.calendar_events FOR DELETE
USING (
  created_by = auth.uid()
  OR calendar_id IN (
    SELECT calendar_id FROM public.calendar_permissions 
    WHERE user_id = auth.uid() AND permission_type = 'admin'
  )
);

-- Create indexes for performance
CREATE INDEX idx_calendars_workspace ON public.calendars(workspace_id);
CREATE INDEX idx_calendars_group ON public.calendars(group_id);
CREATE INDEX idx_calendars_status ON public.calendars(status);
CREATE INDEX idx_calendar_events_calendar ON public.calendar_events(calendar_id);
CREATE INDEX idx_calendar_events_workspace ON public.calendar_events(workspace_id);
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_end_time ON public.calendar_events(end_time);
CREATE INDEX idx_calendar_permissions_calendar ON public.calendar_permissions(calendar_id);
CREATE INDEX idx_calendar_permissions_user ON public.calendar_permissions(user_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_calendar_groups_updated_at
  BEFORE UPDATE ON public.calendar_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendars_updated_at
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
