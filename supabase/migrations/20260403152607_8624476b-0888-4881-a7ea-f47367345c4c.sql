
-- Remove single-session-per-day constraint
ALTER TABLE hr_work_sessions 
  DROP CONSTRAINT IF EXISTS hr_work_sessions_employee_id_session_date_key;

-- Add session type and break timestamps
ALTER TABLE hr_work_sessions
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'morning',
  ADD COLUMN IF NOT EXISTS break_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS break_end_at timestamptz;

-- Add unique constraint per employee + date + session_type
ALTER TABLE hr_work_sessions
  ADD CONSTRAINT hr_work_sessions_employee_date_type_key 
  UNIQUE (employee_id, session_date, session_type);
