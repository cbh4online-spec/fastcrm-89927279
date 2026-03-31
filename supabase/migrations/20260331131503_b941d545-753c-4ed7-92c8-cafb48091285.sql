
-- =============================================
-- HR Foundation Phase 1 — Schema Evolution
-- =============================================

-- 1. Evolve hr_employees: add missing columns
ALTER TABLE hr_employees
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS position_id UUID,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS manager_id UUID,
  ADD COLUMN IF NOT EXISTS work_location TEXT,
  ADD COLUMN IF NOT EXISTS remote_status TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE,
  ADD COLUMN IF NOT EXISTS termination_date DATE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add FK constraints (separate because IF NOT EXISTS doesn't work on constraints via ADD COLUMN)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_employees_position_id_fkey') THEN
    ALTER TABLE hr_employees ADD CONSTRAINT hr_employees_position_id_fkey FOREIGN KEY (position_id) REFERENCES hr_job_titles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_employees_department_id_fkey') THEN
    ALTER TABLE hr_employees ADD CONSTRAINT hr_employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES hr_departments(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_employees_manager_id_fkey') THEN
    ALTER TABLE hr_employees ADD CONSTRAINT hr_employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES hr_employees(id);
  END IF;
END $$;

-- Add check constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_employees_employment_status_check') THEN
    ALTER TABLE hr_employees ADD CONSTRAINT hr_employees_employment_status_check 
      CHECK (employment_status IN ('active', 'on_leave', 'terminated', 'suspended'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_employees_employment_type_check') THEN
    ALTER TABLE hr_employees ADD CONSTRAINT hr_employees_employment_type_check 
      CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_employees_remote_status_check') THEN
    ALTER TABLE hr_employees ADD CONSTRAINT hr_employees_remote_status_check 
      CHECK (remote_status IS NULL OR remote_status IN ('office', 'remote', 'hybrid'));
  END IF;
END $$;

-- Backfill first_name/last_name from full_name and other field mappings
UPDATE hr_employees SET 
  first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
  last_name = COALESCE(last_name, CASE WHEN position(' ' in full_name) > 0 THEN substring(full_name from position(' ' in full_name) + 1) ELSE '' END),
  employment_status = COALESCE(employment_status, status, 'active'),
  employment_type = COALESCE(employment_type, contract_type, 'full_time'),
  hire_date = COALESCE(hire_date, start_date),
  termination_date = COALESCE(termination_date, end_date);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_employees_user_id ON hr_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_manager ON hr_employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_department_id ON hr_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_position_id ON hr_employees(position_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_employment_status ON hr_employees(employment_status);

-- 2. Evolve hr_departments: add missing columns
ALTER TABLE hr_departments
  ADD COLUMN IF NOT EXISTS parent_department_id UUID REFERENCES hr_departments(id),
  ADD COLUMN IF NOT EXISTS head_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_departments_head_id_fkey') THEN
    ALTER TABLE hr_departments ADD CONSTRAINT hr_departments_head_id_fkey FOREIGN KEY (head_id) REFERENCES hr_employees(id);
  END IF;
END $$;

-- 3. Evolve hr_job_titles to include position features
ALTER TABLE hr_job_titles
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT,
  ADD COLUMN IF NOT EXISTS salary_min INTEGER,
  ADD COLUMN IF NOT EXISTS salary_max INTEGER,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_job_titles_level_check') THEN
    ALTER TABLE hr_job_titles ADD CONSTRAINT hr_job_titles_level_check 
      CHECK (level IS NULL OR level IN ('junior', 'mid', 'senior', 'lead', 'principal', 'executive'));
  END IF;
END $$;

-- 4. Create hr_contracts table
CREATE TABLE IF NOT EXISTS hr_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  
  contract_type TEXT NOT NULL DEFAULT 'permanent',
  start_date DATE NOT NULL,
  end_date DATE,
  
  salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  salary_frequency TEXT DEFAULT 'monthly',
  
  hours_per_week DECIMAL(5, 2) DEFAULT 40,
  
  document_url TEXT,
  signed_at TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_contracts_contract_type_check') THEN
    ALTER TABLE hr_contracts ADD CONSTRAINT hr_contracts_contract_type_check 
      CHECK (contract_type IN ('permanent', 'fixed_term', 'freelance', 'internship'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_contracts_salary_frequency_check') THEN
    ALTER TABLE hr_contracts ADD CONSTRAINT hr_contracts_salary_frequency_check 
      CHECK (salary_frequency IS NULL OR salary_frequency IN ('monthly', 'annual', 'hourly'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hr_contracts_employee ON hr_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_workspace ON hr_contracts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_active ON hr_contracts(is_active) WHERE is_active = true;

-- 5. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_hr_contracts_updated_at') THEN
    CREATE TRIGGER update_hr_contracts_updated_at BEFORE UPDATE ON hr_contracts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_hr_departments_updated_at') THEN
    CREATE TRIGGER update_hr_departments_updated_at BEFORE UPDATE ON hr_departments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_hr_job_titles_updated_at') THEN
    CREATE TRIGGER update_hr_job_titles_updated_at BEFORE UPDATE ON hr_job_titles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 6. RLS for hr_contracts
ALTER TABLE hr_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own contracts"
  ON hr_contracts FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND (
      employee_id IN (SELECT id FROM hr_employees WHERE user_id = auth.uid())
      OR workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

CREATE POLICY "HR admins can manage contracts"
  ON hr_contracts FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- 7. Update hr_employees RLS to be more granular
DROP POLICY IF EXISTS "workspace_isolation" ON hr_employees;

CREATE POLICY "Members can view employees in workspace"
  ON hr_employees FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can insert employees"
  ON hr_employees FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can update employees"
  ON hr_employees FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can delete employees"
  ON hr_employees FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
