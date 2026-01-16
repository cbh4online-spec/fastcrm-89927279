
-- User availability base schedules (weekly recurring)
CREATE TABLE public.user_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Horário Principal',
  timezone TEXT NOT NULL DEFAULT 'Europe/Lisbon',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Weekly time slots for availability
CREATE TABLE public.availability_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  availability_id UUID NOT NULL REFERENCES public.user_availability(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Date-specific exceptions (overrides or blocks)
CREATE TABLE public.availability_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  availability_id UUID NOT NULL REFERENCES public.user_availability(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('unavailable', 'custom')),
  start_time TIME, -- NULL if unavailable all day
  end_time TIME,   -- NULL if unavailable all day
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_custom_time CHECK (
    exception_type = 'unavailable' OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

-- Link availability to calendars
CREATE TABLE public.availability_calendar_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  availability_id UUID NOT NULL REFERENCES public.user_availability(id) ON DELETE CASCADE,
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(availability_id, calendar_id)
);

-- Enable RLS
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_calendar_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_availability
CREATE POLICY "Users can view availability in their workspace"
  ON public.user_availability FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can manage their own availability"
  ON public.user_availability FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all availability"
  ON public.user_availability FOR ALL
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- RLS Policies for availability_slots
CREATE POLICY "Users can view slots for accessible availability"
  ON public.availability_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_availability ua
      WHERE ua.id = availability_id
      AND public.is_workspace_member(auth.uid(), ua.workspace_id)
    )
  );

CREATE POLICY "Users can manage their own slots"
  ON public.availability_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_availability ua
      WHERE ua.id = availability_id AND ua.user_id = auth.uid()
    )
  );

-- RLS Policies for availability_exceptions
CREATE POLICY "Users can view exceptions for accessible availability"
  ON public.availability_exceptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_availability ua
      WHERE ua.id = availability_id
      AND public.is_workspace_member(auth.uid(), ua.workspace_id)
    )
  );

CREATE POLICY "Users can manage their own exceptions"
  ON public.availability_exceptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_availability ua
      WHERE ua.id = availability_id AND ua.user_id = auth.uid()
    )
  );

-- RLS Policies for calendar assignments
CREATE POLICY "Users can view calendar assignments"
  ON public.availability_calendar_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_availability ua
      WHERE ua.id = availability_id
      AND public.is_workspace_member(auth.uid(), ua.workspace_id)
    )
  );

CREATE POLICY "Users can manage their own calendar assignments"
  ON public.availability_calendar_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_availability ua
      WHERE ua.id = availability_id AND ua.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_user_availability_workspace ON public.user_availability(workspace_id);
CREATE INDEX idx_user_availability_user ON public.user_availability(user_id);
CREATE INDEX idx_availability_slots_availability ON public.availability_slots(availability_id);
CREATE INDEX idx_availability_exceptions_availability ON public.availability_exceptions(availability_id);
CREATE INDEX idx_availability_exceptions_date ON public.availability_exceptions(exception_date);

-- Triggers for updated_at
CREATE TRIGGER update_user_availability_updated_at
  BEFORE UPDATE ON public.user_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user is available at a specific time
CREATE OR REPLACE FUNCTION public.check_user_availability(
  p_user_id UUID,
  p_workspace_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_start_time TIME;
  v_end_time TIME;
  v_has_slot BOOLEAN;
  v_has_exception BOOLEAN;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_start_time)::INTEGER;
  v_start_time := p_start_time::TIME;
  v_end_time := p_end_time::TIME;
  
  -- Check for date exceptions first
  SELECT EXISTS (
    SELECT 1 FROM availability_exceptions ae
    JOIN user_availability ua ON ua.id = ae.availability_id
    WHERE ua.user_id = p_user_id
      AND ua.workspace_id = p_workspace_id
      AND ua.is_active = true
      AND ae.exception_date = p_start_time::DATE
      AND ae.exception_type = 'unavailable'
  ) INTO v_has_exception;
  
  IF v_has_exception THEN
    RETURN false;
  END IF;
  
  -- Check for custom exception slots
  SELECT EXISTS (
    SELECT 1 FROM availability_exceptions ae
    JOIN user_availability ua ON ua.id = ae.availability_id
    WHERE ua.user_id = p_user_id
      AND ua.workspace_id = p_workspace_id
      AND ua.is_active = true
      AND ae.exception_date = p_start_time::DATE
      AND ae.exception_type = 'custom'
      AND ae.start_time <= v_start_time
      AND ae.end_time >= v_end_time
  ) INTO v_has_slot;
  
  IF v_has_slot THEN
    RETURN true;
  END IF;
  
  -- Check regular weekly slots
  SELECT EXISTS (
    SELECT 1 FROM availability_slots s
    JOIN user_availability ua ON ua.id = s.availability_id
    WHERE ua.user_id = p_user_id
      AND ua.workspace_id = p_workspace_id
      AND ua.is_active = true
      AND s.day_of_week = v_day_of_week
      AND s.start_time <= v_start_time
      AND s.end_time >= v_end_time
  ) INTO v_has_slot;
  
  RETURN COALESCE(v_has_slot, false);
END;
$$;
