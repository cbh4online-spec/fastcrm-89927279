
-- =============================================
-- FIX 1: c2c_sellers - Remove anon access to banking PII
-- =============================================

-- Drop policies that expose banking data to anonymous users
DROP POLICY IF EXISTS "Public can view approved c2c sellers" ON public.c2c_sellers;
DROP POLICY IF EXISTS "Public can view approved sellers" ON public.c2c_sellers;

-- Create a safe public view excluding sensitive financial fields
CREATE OR REPLACE VIEW public.c2c_sellers_public AS
SELECT
  id,
  workspace_id,
  display_name,
  bio,
  location,
  avatar_url,
  is_verified,
  total_sales,
  status,
  created_at
FROM public.c2c_sellers
WHERE status = 'approved';

-- Grant anon/authenticated access to the view only
GRANT SELECT ON public.c2c_sellers_public TO anon, authenticated;

-- =============================================
-- FIX 2: deal_intelligence_cache - Remove public full access
-- =============================================

DROP POLICY IF EXISTS "Service role full access" ON public.deal_intelligence_cache;

-- No replacement policy needed - service_role bypasses RLS by default

-- =============================================
-- FIX 3: fastclub_applications - Scope to workspace members
-- =============================================

DROP POLICY IF EXISTS "Allow authenticated read" ON public.fastclub_applications;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.fastclub_applications;

-- Only workspace members can read applications in their workspace
CREATE POLICY "Workspace members can read applications"
ON public.fastclub_applications
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

-- Only workspace admins/owners can update applications
CREATE POLICY "Workspace admins can update applications"
ON public.fastclub_applications
FOR UPDATE
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
  OR public.is_super_admin(auth.uid())
);

-- =============================================
-- FIX 4: edge_function_rate_limits - Enable RLS
-- =============================================

ALTER TABLE public.edge_function_rate_limits ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT policies for regular users - only service_role accesses this table
