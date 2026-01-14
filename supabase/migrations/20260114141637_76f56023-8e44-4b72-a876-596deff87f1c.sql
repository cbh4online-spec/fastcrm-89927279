-- Add unique constraint option to custom fields
ALTER TABLE public.custom_fields 
ADD COLUMN IF NOT EXISTS is_unique boolean NOT NULL DEFAULT false;

-- Create a function to check for duplicate custom field values
CREATE OR REPLACE FUNCTION public.check_custom_field_unique_value(
  p_custom_field_id uuid,
  p_entity_id uuid,
  p_value jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_unique boolean;
  v_workspace_id uuid;
  v_entity_type text;
  v_existing_count integer;
BEGIN
  -- Get the custom field details
  SELECT cf.is_unique, cf.workspace_id, cf.entity_type
  INTO v_is_unique, v_workspace_id, v_entity_type
  FROM public.custom_fields cf
  WHERE cf.id = p_custom_field_id;
  
  -- If field is not marked as unique, always return true
  IF NOT v_is_unique THEN
    RETURN true;
  END IF;
  
  -- Check if value already exists for another entity
  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.custom_field_values cfv
  JOIN public.custom_fields cf ON cf.id = cfv.custom_field_id
  WHERE cfv.custom_field_id = p_custom_field_id
    AND cfv.entity_id != p_entity_id
    AND cfv.value = p_value
    AND cf.workspace_id = v_workspace_id;
  
  RETURN v_existing_count = 0;
END;
$$;