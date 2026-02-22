
-- Restrict searches visibility to creator or admins
DROP POLICY IF EXISTS "Users can view searches in their workspace" ON professional_prospecting_searches;
CREATE POLICY "Users can view own searches or admin sees all"
  ON professional_prospecting_searches FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_workspace_admin_or_owner(auth.uid(), workspace_id)
    OR is_super_admin(auth.uid())
  );

-- Restrict profiles visibility to parent search creator or admins
DROP POLICY IF EXISTS "Users can view profiles in their workspace" ON professional_prospecting_profiles;
CREATE POLICY "Users can view own profiles or admin sees all"
  ON professional_prospecting_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professional_prospecting_searches s
      WHERE s.id = search_id AND s.created_by = auth.uid()
    )
    OR is_workspace_admin_or_owner(auth.uid(), workspace_id)
    OR is_super_admin(auth.uid())
  );
