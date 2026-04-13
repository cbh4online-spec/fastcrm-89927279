
-- Drop existing policies
DROP POLICY IF EXISTS "Members can view workspace social channels" ON workspace_ghl_social_channels;
DROP POLICY IF EXISTS "Members can insert workspace social channels" ON workspace_ghl_social_channels;
DROP POLICY IF EXISTS "Members can update workspace social channels" ON workspace_ghl_social_channels;
DROP POLICY IF EXISTS "Members can delete workspace social channels" ON workspace_ghl_social_channels;

-- Recreate with super admin bypass
CREATE POLICY "Members can view workspace social channels" ON workspace_ghl_social_channels
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_ghl_social_channels.workspace_id AND wm.user_id = auth.uid())
  );

CREATE POLICY "Members can insert workspace social channels" ON workspace_ghl_social_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_ghl_social_channels.workspace_id AND wm.user_id = auth.uid())
  );

CREATE POLICY "Members can update workspace social channels" ON workspace_ghl_social_channels
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_ghl_social_channels.workspace_id AND wm.user_id = auth.uid())
  );

CREATE POLICY "Members can delete workspace social channels" ON workspace_ghl_social_channels
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_ghl_social_channels.workspace_id AND wm.user_id = auth.uid())
  );
