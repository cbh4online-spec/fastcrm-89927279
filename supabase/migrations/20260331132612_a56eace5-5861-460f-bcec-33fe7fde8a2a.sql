
-- =============================================
-- TIME-OFF MANAGEMENT: Schema Evolution
-- =============================================

-- 1. Evolve hr_absence_types
ALTER TABLE public.hr_absence_types
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS can_carry_over BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS advance_notice_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Unique constraint on workspace + code
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_absence_types_workspace_code_key') THEN
    ALTER TABLE public.hr_absence_types ADD CONSTRAINT hr_absence_types_workspace_code_key UNIQUE (workspace_id, code);
  END IF;
END $$;

-- updated_at trigger
CREATE OR REPLACE TRIGGER set_hr_absence_types_updated_at
  BEFORE UPDATE ON public.hr_absence_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Evolve hr_absences
ALTER TABLE public.hr_absences
  ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS conflict_detected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conflict_details JSONB;

-- Change total_days to DECIMAL(5,2) if it's integer
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hr_absences' AND column_name = 'total_days' AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.hr_absences ALTER COLUMN total_days TYPE DECIMAL(5,2);
  END IF;
END $$;

-- Index on status + dates
CREATE INDEX IF NOT EXISTS idx_hr_absences_status ON public.hr_absences (status);
CREATE INDEX IF NOT EXISTS idx_hr_absences_dates ON public.hr_absences (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_hr_absences_employee ON public.hr_absences (employee_id);

-- 3. Create hr_leave_balances
CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.hr_absence_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  used_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  pending_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  carried_over_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  available_days DECIMAL(5,2) GENERATED ALWAYS AS (total_days + carried_over_days - used_days - pending_days) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, employee_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_employee_year ON public.hr_leave_balances (employee_id, year);

ALTER TABLE public.hr_leave_balances ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER set_hr_leave_balances_updated_at
  BEFORE UPDATE ON public.hr_leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create hr_public_holidays
CREATE TABLE IF NOT EXISTS public.hr_public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  country TEXT NOT NULL DEFAULT 'PT',
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, date)
);

CREATE INDEX IF NOT EXISTS idx_hr_public_holidays_date ON public.hr_public_holidays (workspace_id, date);

ALTER TABLE public.hr_public_holidays ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- hr_leave_balances: workspace members can view their own, admin/owner can manage all
CREATE POLICY "hr_leave_balances_select_own" ON public.hr_leave_balances
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "hr_leave_balances_manage_admin" ON public.hr_leave_balances
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- hr_public_holidays: all workspace members can view, admin/owner manage
CREATE POLICY "hr_public_holidays_select" ON public.hr_public_holidays
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "hr_public_holidays_manage_admin" ON public.hr_public_holidays
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
