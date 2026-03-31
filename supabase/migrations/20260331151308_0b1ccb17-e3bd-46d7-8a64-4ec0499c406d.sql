
-- Function to sync workspace_members to hr_employees
CREATE OR REPLACE FUNCTION public.sync_workspace_member_to_hr_employee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_email text;
  v_avatar text;
BEGIN
  -- Get profile info
  SELECT full_name, email, avatar_url
  INTO v_full_name, v_email, v_avatar
  FROM public.profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- Insert into hr_employees if not exists
  INSERT INTO public.hr_employees (workspace_id, user_id, full_name, email, avatar_url, status)
  VALUES (
    NEW.workspace_id,
    NEW.user_id,
    COALESCE(v_full_name, 'Sem nome'),
    v_email,
    v_avatar,
    'active'
  )
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Add unique constraint on (workspace_id, user_id) if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hr_employees_workspace_user_unique'
  ) THEN
    ALTER TABLE public.hr_employees ADD CONSTRAINT hr_employees_workspace_user_unique UNIQUE (workspace_id, user_id);
  END IF;
END$$;

-- Create trigger on workspace_members
DROP TRIGGER IF EXISTS trg_sync_member_to_hr_employee ON public.workspace_members;
CREATE TRIGGER trg_sync_member_to_hr_employee
  AFTER INSERT ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_workspace_member_to_hr_employee();

-- Backfill: insert all existing workspace_members that don't have hr_employees yet
INSERT INTO public.hr_employees (workspace_id, user_id, full_name, email, avatar_url, status)
SELECT
  wm.workspace_id,
  wm.user_id,
  COALESCE(p.full_name, 'Sem nome'),
  p.email,
  p.avatar_url,
  'active'
FROM public.workspace_members wm
LEFT JOIN public.profiles p ON p.user_id = wm.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.hr_employees he
  WHERE he.workspace_id = wm.workspace_id AND he.user_id = wm.user_id
);
