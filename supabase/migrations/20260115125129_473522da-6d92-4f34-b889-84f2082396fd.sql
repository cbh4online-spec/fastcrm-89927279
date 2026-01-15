-- Allow super admins to read all workspace subscriptions
CREATE POLICY "Super admins can read all subscriptions"
ON public.workspace_subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid() 
    AND wm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM admin_settings 
    WHERE key = 'super_admins' 
    AND value::jsonb ? auth.uid()::text
  )
);

-- Allow super admins to manage all workspace subscriptions
CREATE POLICY "Super admins can manage all subscriptions"
ON public.workspace_subscriptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid() 
    AND wm.role = 'admin'
  )
);