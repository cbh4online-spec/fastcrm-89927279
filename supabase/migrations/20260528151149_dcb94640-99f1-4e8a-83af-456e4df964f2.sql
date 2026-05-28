ALTER TABLE public.saft_imports
  ADD COLUMN IF NOT EXISTS last_error_step text,
  ADD COLUMN IF NOT EXISTS last_step text,
  ADD COLUMN IF NOT EXISTS last_step_at timestamptz,
  ADD COLUMN IF NOT EXISTS debug_log jsonb NOT NULL DEFAULT '[]'::jsonb;