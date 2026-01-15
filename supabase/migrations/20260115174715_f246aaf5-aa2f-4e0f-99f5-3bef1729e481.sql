-- Drop the problematic policy that doesn't check is_super_admin correctly
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON workspace_subscriptions;

-- Create a proper policy for super admins to manage subscriptions
CREATE POLICY "Super admins can manage all subscriptions" 
ON workspace_subscriptions
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));