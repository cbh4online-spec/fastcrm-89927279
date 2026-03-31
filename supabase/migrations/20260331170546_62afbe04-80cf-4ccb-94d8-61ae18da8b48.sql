-- 1. Drop old FK FIRST so we can update head_id values freely
ALTER TABLE hr_departments DROP CONSTRAINT IF EXISTS hr_departments_head_id_fkey;

-- 2. Map existing head_id from workspace_members to hr_employees
UPDATE hr_departments
SET head_id = sub.emp_id
FROM (
  SELECT d.id AS dept_id, e.id AS emp_id
  FROM hr_departments d
  JOIN workspace_members wm ON wm.id = d.head_id
  JOIN hr_employees e ON e.user_id = wm.user_id AND e.workspace_id = d.workspace_id
  WHERE d.head_id IS NOT NULL
) sub
WHERE hr_departments.id = sub.dept_id;

-- 2b. Null out any head_id values that couldn't be mapped
UPDATE hr_departments
SET head_id = NULL
WHERE head_id IS NOT NULL
  AND head_id NOT IN (SELECT id FROM hr_employees);

-- 3. Add new FK to hr_employees
ALTER TABLE hr_departments 
  ADD CONSTRAINT hr_departments_head_employee_id_fkey 
  FOREIGN KEY (head_id) REFERENCES hr_employees(id) ON DELETE SET NULL;

-- 4. Add contract_type_id FK to hr_employees
ALTER TABLE hr_employees 
  ADD COLUMN IF NOT EXISTS contract_type_id uuid REFERENCES hr_contract_types(id) ON DELETE SET NULL;

-- 5. Migrate data from hr_employee_profiles to hr_employees
UPDATE hr_employees
SET 
  employee_number = COALESCE(hr_employees.employee_number, sub.employee_number),
  contract_type = COALESCE(hr_employees.contract_type, sub.contract_type),
  weekly_hours = COALESCE(hr_employees.weekly_hours, sub.weekly_hours),
  qr_code_token = COALESCE(hr_employees.qr_code_token, sub.qr_code_token),
  notes = COALESCE(hr_employees.notes, sub.notes),
  start_date = COALESCE(hr_employees.start_date, sub.start_date),
  end_date = COALESCE(hr_employees.end_date, sub.end_date),
  status = COALESCE(hr_employees.status, sub.status)
FROM (
  SELECT p.employee_number, p.contract_type, p.weekly_hours, p.qr_code_token, p.notes, p.start_date, p.end_date, p.status, wm.user_id, p.workspace_id
  FROM hr_employee_profiles p
  JOIN workspace_members wm ON wm.id = p.member_id
) sub
WHERE hr_employees.user_id = sub.user_id
  AND hr_employees.workspace_id = sub.workspace_id;

-- 6. Trigger: prevent manager_id = id
CREATE OR REPLACE FUNCTION public.prevent_self_manager()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.manager_id IS NOT NULL AND NEW.manager_id = NEW.id THEN
    RAISE EXCEPTION 'Employee cannot be their own manager';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_manager ON hr_employees;
CREATE TRIGGER trg_prevent_self_manager
  BEFORE INSERT OR UPDATE ON hr_employees
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_manager();

-- 7. Trigger: prevent circular parent_department_id
CREATE OR REPLACE FUNCTION public.prevent_circular_department()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_id uuid := NEW.parent_department_id;
  depth int := 0;
BEGIN
  IF NEW.parent_department_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_department_id = NEW.id THEN
    RAISE EXCEPTION 'Department cannot be its own parent';
  END IF;
  WHILE current_id IS NOT NULL AND depth < 20 LOOP
    SELECT parent_department_id INTO current_id FROM hr_departments WHERE id = current_id;
    IF current_id = NEW.id THEN
      RAISE EXCEPTION 'Circular department hierarchy detected';
    END IF;
    depth := depth + 1;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_circular_department ON hr_departments;
CREATE TRIGGER trg_prevent_circular_department
  BEFORE INSERT OR UPDATE ON hr_departments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_circular_department();