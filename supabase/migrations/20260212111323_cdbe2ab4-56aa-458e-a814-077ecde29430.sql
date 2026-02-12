
-- Create a function that auto-creates the FastMatch pipeline for each workspace
-- This runs once for all existing workspaces and via trigger for new ones

CREATE OR REPLACE FUNCTION public.create_fastmatch_pipeline_for_workspace(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pipeline_id uuid;
BEGIN
  -- Check if pipeline already exists
  SELECT id INTO v_pipeline_id
  FROM pipelines
  WHERE workspace_id = p_workspace_id AND name = 'FastMatch'
  LIMIT 1;

  IF v_pipeline_id IS NULL THEN
    -- Create pipeline
    INSERT INTO pipelines (workspace_id, name, type, description, is_default)
    VALUES (p_workspace_id, 'FastMatch', 'sales', 'Pipeline de conexões FastMatch', false)
    RETURNING id INTO v_pipeline_id;

    -- Create stages
    INSERT INTO pipeline_stages (pipeline_id, workspace_id, name, position, probability, color, description) VALUES
      (v_pipeline_id, p_workspace_id, 'Interesse Mútuo', 1, 20, '#3b82f6', 'Interesse mútuo confirmado'),
      (v_pipeline_id, p_workspace_id, 'Em Conversa', 2, 40, '#f59e0b', 'Em negociação inicial'),
      (v_pipeline_id, p_workspace_id, 'Proposta', 3, 70, '#8b5cf6', 'Proposta enviada'),
      (v_pipeline_id, p_workspace_id, 'Fechado', 4, 100, '#22c55e', 'Negócio fechado');
  END IF;
END;
$$;

-- Create FastMatch pipeline for all existing workspaces
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM workspaces LOOP
    PERFORM create_fastmatch_pipeline_for_workspace(r.id);
  END LOOP;
END;
$$;

-- Trigger for new workspaces
CREATE OR REPLACE FUNCTION public.auto_create_fastmatch_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_fastmatch_pipeline_for_workspace(NEW.id);
  RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_fastmatch_pipeline'
  ) THEN
    CREATE TRIGGER trigger_create_fastmatch_pipeline
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_fastmatch_pipeline();
  END IF;
END;
$$;
