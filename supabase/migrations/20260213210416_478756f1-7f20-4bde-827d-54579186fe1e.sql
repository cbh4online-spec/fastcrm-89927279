
-- P2-3: Create atomic set_default_vibe_profile function
CREATE OR REPLACE FUNCTION public.set_default_vibe_profile(p_workspace_id uuid, p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Unset all defaults for this workspace
  UPDATE vibe_profiles
  SET is_default = false
  WHERE workspace_id = p_workspace_id AND is_default = true;

  -- Set the new default
  UPDATE vibe_profiles
  SET is_default = true
  WHERE id = p_profile_id AND workspace_id = p_workspace_id;
END;
$$;

-- P2-2: Create batch reorder objectives function
CREATE OR REPLACE FUNCTION public.batch_reorder_objectives(p_ids uuid[], p_positions int[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int;
BEGIN
  FOR i IN 1..array_length(p_ids, 1) LOOP
    UPDATE conversation_objectives
    SET sort_position = p_positions[i]
    WHERE id = p_ids[i];
  END LOOP;
END;
$$;
