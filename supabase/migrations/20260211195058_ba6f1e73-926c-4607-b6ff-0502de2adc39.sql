
-- Allow public access to workspaces that have active C2C listings
CREATE POLICY "Public can view workspace for c2c marketplace"
ON public.workspaces FOR SELECT
TO anon, authenticated
USING (
  id IN (
    SELECT DISTINCT workspace_id FROM c2c_listings
    WHERE status = 'active' AND moderation_status = 'approved'
  )
);

-- Allow public access to approved C2C sellers
CREATE POLICY "Public can view approved c2c sellers"
ON public.c2c_sellers FOR SELECT
TO anon, authenticated
USING (status = 'approved');
