
-- Step 1: Add RLS policy so users can read their own roles
CREATE POLICY "Users can view own roles"
ON public.client_user_roles
FOR SELECT TO authenticated
USING (
  client_user_id IN (
    SELECT id FROM public.client_users 
    WHERE auth_user_id = auth.uid()
  )
);
