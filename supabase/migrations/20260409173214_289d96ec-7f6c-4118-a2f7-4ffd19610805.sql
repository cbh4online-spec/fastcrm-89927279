ALTER TABLE public.hr_work_sessions
DROP CONSTRAINT IF EXISTS hr_work_sessions_employee_date_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS hr_work_sessions_employee_date_standard_type_key
ON public.hr_work_sessions (employee_id, session_date, session_type)
WHERE session_type IN ('morning', 'afternoon');