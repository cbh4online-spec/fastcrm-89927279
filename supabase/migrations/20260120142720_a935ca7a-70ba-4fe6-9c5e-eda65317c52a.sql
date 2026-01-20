-- Add status field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Create function for super admin to update user status
CREATE OR REPLACE FUNCTION public.update_user_status_admin(
  p_user_id UUID,
  p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check if caller is super admin
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can update user status';
  END IF;

  -- Validate status
  IF p_status NOT IN ('active', 'inactive', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status. Must be: active, inactive, or suspended';
  END IF;

  -- Update profile status
  UPDATE public.profiles
  SET status = p_status, updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Log the action
  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action_type,
    target_type,
    target_id,
    details
  ) VALUES (
    auth.uid(),
    'update_user_status',
    'user',
    p_user_id::text,
    jsonb_build_object('new_status', p_status)
  );

  SELECT jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'status', p_status
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (function checks for super admin internally)
GRANT EXECUTE ON FUNCTION public.update_user_status_admin TO authenticated;