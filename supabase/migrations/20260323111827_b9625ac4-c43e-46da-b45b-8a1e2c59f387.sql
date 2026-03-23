
-- Function to auto-create lead in METODOPARE when a new workspace is created
CREATE OR REPLACE FUNCTION public.create_lead_on_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metodopare_id UUID := 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f';
  v_owner_id UUID;
  v_profile RECORD;
BEGIN
  -- Don't create lead for METODOPARE's own workspace
  IF NEW.id = v_metodopare_id THEN
    RETURN NEW;
  END IF;

  -- Get the owner user_id from workspace_members
  SELECT user_id INTO v_owner_id
  FROM workspace_members
  WHERE workspace_id = NEW.id AND role = 'owner'
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get profile data
  SELECT full_name, email INTO v_profile
  FROM profiles
  WHERE user_id = v_owner_id;

  IF v_profile.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check for duplicate by email in METODOPARE leads
  IF EXISTS (
    SELECT 1 FROM leads
    WHERE workspace_id = v_metodopare_id
      AND email = v_profile.email
  ) THEN
    RETURN NEW;
  END IF;

  -- Insert lead in METODOPARE workspace
  INSERT INTO leads (
    workspace_id, name, email, source, status, company,
    notes, created_by
  ) VALUES (
    v_metodopare_id,
    COALESCE(v_profile.full_name, v_profile.email),
    v_profile.email,
    'Registo FastCRM',
    'new',
    NEW.name,
    'Workspace: ' || NEW.slug || ' | Criado em: ' || NEW.created_at::text,
    v_owner_id
  );

  RETURN NEW;
END;
$$;

-- Trigger on workspaces AFTER INSERT
CREATE TRIGGER trg_lead_on_new_workspace
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.create_lead_on_new_workspace();
