
-- 1. Add 'hr' role to workspace_role enum
ALTER TYPE workspace_role ADD VALUE IF NOT EXISTS 'hr';

-- 2. Create hr_employee_profiles table
CREATE TABLE public.hr_employee_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_title text,
  department text,
  employee_number text,
  contract_type text DEFAULT 'full_time',
  start_date date,
  end_date date,
  status text DEFAULT 'active',
  weekly_hours numeric DEFAULT 40,
  qr_code_token text DEFAULT gen_random_uuid()::text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id)
);

-- 3. Enable RLS
ALTER TABLE public.hr_employee_profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Members can view HR profiles in their workspace"
  ON public.hr_employee_profiles FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins and owners can manage HR profiles"
  ON public.hr_employee_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_employee_profiles.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );

-- 5. Add member_id column to hr_time_entries (keeping employee_id for now)
ALTER TABLE public.hr_time_entries ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL;

-- 6. Add member_id column to hr_absences
ALTER TABLE public.hr_absences ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL;

-- 7. Add member_id column to hr_work_sessions
ALTER TABLE public.hr_work_sessions ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL;

-- 8. Add member_id to hr_schedules
ALTER TABLE public.hr_schedules ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL;

-- 9. Index for performance
CREATE INDEX IF NOT EXISTS idx_hr_employee_profiles_workspace ON public.hr_employee_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hr_employee_profiles_member ON public.hr_employee_profiles(member_id);
