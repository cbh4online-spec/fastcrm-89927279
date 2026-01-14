-- Force policy refresh by dropping and recreating with explicit auth check
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;

CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (auth.role() = 'authenticated');