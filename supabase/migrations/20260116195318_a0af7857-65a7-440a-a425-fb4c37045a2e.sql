
-- Create service categories table
CREATE TABLE public.service_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 60, -- in minutes
  price NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  color TEXT DEFAULT '#3B82F6',
  
  -- Booking rules
  buffer_before INTEGER DEFAULT 0, -- minutes before
  buffer_after INTEGER DEFAULT 0, -- minutes after
  min_notice_hours INTEGER DEFAULT 24, -- minimum hours in advance
  max_booking_days INTEGER DEFAULT 60, -- max days in future
  max_per_day INTEGER, -- max bookings per day (null = unlimited)
  
  -- Form association
  form_id UUID, -- reference to form_definitions if needed
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- available for public booking
  requires_confirmation BOOLEAN DEFAULT false,
  allow_cancellation BOOLEAN DEFAULT true,
  cancellation_hours INTEGER DEFAULT 24, -- hours before to allow cancel
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service resources (what resources are needed)
CREATE TABLE public.service_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.meeting_resources(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, resource_id)
);

-- Service locations (where can this service be provided)
CREATE TABLE public.service_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL CHECK (location_type IN ('physical', 'online', 'phone', 'client_location')),
  location_name TEXT,
  location_address TEXT,
  meeting_url TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service user assignments (who can provide this service)
CREATE TABLE public.service_user_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  custom_duration INTEGER, -- override service duration
  custom_price NUMERIC(12,2), -- override service price
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, user_id)
);

-- Service team assignments (which teams can provide this service)
CREATE TABLE public.service_team_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  routing_mode TEXT DEFAULT 'round_robin' CHECK (routing_mode IN ('round_robin', 'least_busy', 'manual', 'random')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, team_id)
);

-- Service availability windows (when can this service be booked)
CREATE TABLE public.service_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_categories
CREATE POLICY "Users can view service categories in their workspace"
  ON public.service_categories FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage service categories"
  ON public.service_categories FOR ALL
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- RLS Policies for services
CREATE POLICY "Users can view services in their workspace"
  ON public.services FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- RLS Policies for service_resources
CREATE POLICY "Users can view service resources"
  ON public.service_resources FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_id 
    AND public.is_workspace_member(auth.uid(), s.workspace_id)
  ));

CREATE POLICY "Admins can manage service resources"
  ON public.service_resources FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_id 
    AND public.is_workspace_admin_or_owner(auth.uid(), s.workspace_id)
  ));

-- RLS Policies for service_locations
CREATE POLICY "Users can view service locations"
  ON public.service_locations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_id 
    AND public.is_workspace_member(auth.uid(), s.workspace_id)
  ));

CREATE POLICY "Admins can manage service locations"
  ON public.service_locations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_id 
    AND public.is_workspace_admin_or_owner(auth.uid(), s.workspace_id)
  ));

-- RLS Policies for service_user_assignments
CREATE POLICY "Users can view service user assignments"
  ON public.service_user_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_id 
    AND public.is_workspace_member(auth.uid(), s.workspace_id)
  ));

CREATE POLICY "Admins can manage service user assignments"
  ON public.service_user_assignments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_id 
    AND public.is_workspace_admin_or_owner(auth.uid(), s.workspace_id)
  ));

-- RLS Policies for service_team_assignments
CREATE POLICY "Users can view service team assignments"
  ON public.service_team_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_id 
    AND public.is_workspace_member(auth.uid(), s.workspace_id)
  ));

CREATE POLICY "Admins can manage service team assignments"
  ON public.service_team_assignments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_id 
    AND public.is_workspace_admin_or_owner(auth.uid(), s.workspace_id)
  ));

-- RLS Policies for service_availability
CREATE POLICY "Users can view service availability"
  ON public.service_availability FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_id 
    AND public.is_workspace_member(auth.uid(), s.workspace_id)
  ));

CREATE POLICY "Admins can manage service availability"
  ON public.service_availability FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_id 
    AND public.is_workspace_admin_or_owner(auth.uid(), s.workspace_id)
  ));

-- Indexes
CREATE INDEX idx_service_categories_workspace ON public.service_categories(workspace_id);
CREATE INDEX idx_services_workspace ON public.services(workspace_id);
CREATE INDEX idx_services_category ON public.services(category_id);
CREATE INDEX idx_services_active ON public.services(workspace_id, is_active);
CREATE INDEX idx_service_resources_service ON public.service_resources(service_id);
CREATE INDEX idx_service_locations_service ON public.service_locations(service_id);
CREATE INDEX idx_service_user_assignments_service ON public.service_user_assignments(service_id);
CREATE INDEX idx_service_user_assignments_user ON public.service_user_assignments(user_id);
CREATE INDEX idx_service_team_assignments_service ON public.service_team_assignments(service_id);
CREATE INDEX idx_service_availability_service ON public.service_availability(service_id);

-- Triggers for updated_at
CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add service_id to meetings table for linking
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_service ON public.meetings(service_id);

-- Link services to calendars
ALTER TABLE public.calendar_service_assignments DROP CONSTRAINT IF EXISTS calendar_service_assignments_service_id_fkey;
ALTER TABLE public.calendar_service_assignments 
  ADD CONSTRAINT calendar_service_assignments_service_id_fkey 
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;
