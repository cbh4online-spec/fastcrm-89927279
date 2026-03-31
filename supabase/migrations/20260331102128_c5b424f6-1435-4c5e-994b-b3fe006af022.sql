
-- ============================================================
-- TABLE: hr_employees
-- ============================================================
CREATE TABLE public.hr_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  job_title text,
  department text,
  employee_number text,
  contract_type text CHECK (contract_type IN ('full_time', 'part_time', 'contractor', 'intern')) DEFAULT 'full_time',
  start_date date,
  end_date date,
  status text CHECK (status IN ('active', 'inactive', 'on_leave')) DEFAULT 'active',
  avatar_url text,
  qr_code_token text UNIQUE DEFAULT gen_random_uuid()::text,
  weekly_hours numeric(5,2) DEFAULT 40,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON public.hr_employees
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_hr_employees_workspace ON public.hr_employees(workspace_id);
CREATE INDEX idx_hr_employees_status ON public.hr_employees(workspace_id, status);
CREATE INDEX idx_hr_employees_qr ON public.hr_employees(qr_code_token);

-- ============================================================
-- TABLE: hr_time_entries
-- ============================================================
CREATE TABLE public.hr_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  entry_type text CHECK (entry_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  method text CHECK (method IN ('qr', 'manual', 'app')) DEFAULT 'manual',
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hr_time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON public.hr_time_entries
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_hr_time_entries_workspace ON public.hr_time_entries(workspace_id);
CREATE INDEX idx_hr_time_entries_employee ON public.hr_time_entries(employee_id, recorded_at);
CREATE INDEX idx_hr_time_entries_date ON public.hr_time_entries(workspace_id, recorded_at);

-- ============================================================
-- TABLE: hr_work_sessions
-- ============================================================
CREATE TABLE public.hr_work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  break_minutes integer DEFAULT 0,
  total_minutes integer,
  worked_minutes integer,
  status text CHECK (status IN ('complete', 'incomplete', 'manual')) DEFAULT 'incomplete',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, session_date)
);

ALTER TABLE public.hr_work_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON public.hr_work_sessions
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_hr_work_sessions_workspace ON public.hr_work_sessions(workspace_id);
CREATE INDEX idx_hr_work_sessions_employee ON public.hr_work_sessions(employee_id, session_date);
CREATE INDEX idx_hr_work_sessions_date ON public.hr_work_sessions(workspace_id, session_date);

-- Trigger to auto-compute total_minutes and worked_minutes
CREATE OR REPLACE FUNCTION public.hr_compute_session_minutes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.clock_in_at IS NOT NULL AND NEW.clock_out_at IS NOT NULL THEN
    NEW.total_minutes := EXTRACT(EPOCH FROM (NEW.clock_out_at - NEW.clock_in_at))::integer / 60;
    NEW.worked_minutes := GREATEST(0, NEW.total_minutes - COALESCE(NEW.break_minutes, 0));
  ELSE
    NEW.total_minutes := NULL;
    NEW.worked_minutes := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hr_compute_session_minutes
  BEFORE INSERT OR UPDATE ON public.hr_work_sessions
  FOR EACH ROW EXECUTE FUNCTION public.hr_compute_session_minutes();

-- ============================================================
-- TABLE: hr_shifts
-- ============================================================
CREATE TABLE public.hr_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  color text DEFAULT '#6366f1',
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hr_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON public.hr_shifts
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_hr_shifts_workspace ON public.hr_shifts(workspace_id);

-- ============================================================
-- TABLE: hr_schedules
-- ============================================================
CREATE TABLE public.hr_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES hr_shifts(id) ON DELETE SET NULL,
  schedule_date date NOT NULL,
  custom_start_time time,
  custom_end_time time,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, schedule_date)
);

ALTER TABLE public.hr_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON public.hr_schedules
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_hr_schedules_workspace ON public.hr_schedules(workspace_id);
CREATE INDEX idx_hr_schedules_employee ON public.hr_schedules(employee_id, schedule_date);
CREATE INDEX idx_hr_schedules_date ON public.hr_schedules(workspace_id, schedule_date);

-- ============================================================
-- TABLE: hr_absence_types
-- ============================================================
CREATE TABLE public.hr_absence_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#f59e0b',
  paid boolean DEFAULT true,
  requires_approval boolean DEFAULT true,
  max_days_per_year integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hr_absence_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON public.hr_absence_types
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- ============================================================
-- TABLE: hr_absences
-- ============================================================
CREATE TABLE public.hr_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  absence_type_id uuid REFERENCES hr_absence_types(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  reason text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger to auto-compute total_days
CREATE OR REPLACE FUNCTION public.hr_compute_absence_days()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.total_days := (NEW.end_date - NEW.start_date + 1);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hr_compute_absence_days
  BEFORE INSERT OR UPDATE ON public.hr_absences
  FOR EACH ROW EXECUTE FUNCTION public.hr_compute_absence_days();

ALTER TABLE public.hr_absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON public.hr_absences
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_hr_absences_workspace ON public.hr_absences(workspace_id);
CREATE INDEX idx_hr_absences_employee ON public.hr_absences(employee_id, start_date);
CREATE INDEX idx_hr_absences_status ON public.hr_absences(workspace_id, status);
CREATE INDEX idx_hr_absences_dates ON public.hr_absences(workspace_id, start_date, end_date);
