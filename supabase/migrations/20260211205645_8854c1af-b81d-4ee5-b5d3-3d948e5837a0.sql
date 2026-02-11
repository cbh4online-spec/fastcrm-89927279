DROP POLICY IF EXISTS "Public can view workspace for c2c marketplace" ON workspaces;

CREATE POLICY "Public can view workspace for c2c marketplace" ON workspaces
FOR SELECT USING (
  id IN (
    SELECT DISTINCT workspace_id FROM c2c_listings
    WHERE status = 'active' AND moderation_status = 'approved'
  )
  OR
  id IN (
    SELECT DISTINCT workspace_id FROM c2c_sellers
    WHERE status = 'approved'
  )
);