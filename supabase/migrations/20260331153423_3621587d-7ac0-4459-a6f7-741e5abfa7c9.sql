ALTER TABLE hr_departments DROP CONSTRAINT IF EXISTS hr_departments_head_id_fkey;
ALTER TABLE hr_departments ADD CONSTRAINT hr_departments_head_id_fkey 
  FOREIGN KEY (head_id) REFERENCES workspace_members(id) ON DELETE SET NULL;