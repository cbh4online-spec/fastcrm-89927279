
-- workspaces / store_settings: drop again (previous migration may have been rolled back)
DROP POLICY IF EXISTS "Public can read workspace branding columns only" ON public.workspaces;
DROP POLICY IF EXISTS "Public can read store branding columns only" ON public.store_settings;

-- fastclub_content_sections: scope to workspace members
DROP POLICY IF EXISTS "Authenticated can read content" ON public.fastclub_content_sections;
CREATE POLICY "Workspace members can read content sections"
  ON public.fastclub_content_sections FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- hr_talent_results: remove public job_offer read
DROP POLICY IF EXISTS "Public can view active job offer results" ON public.hr_talent_results;

-- Service role policies wrongly applied to {public} — fix on remaining tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, c.relname, p.polname
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND p.polname ILIKE 'Service role%'
      AND p.polroles = '{0}'::oid[]  -- {public}
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.polname, r.nspname, r.relname);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true)',
      r.polname, r.nspname, r.relname
    );
  END LOOP;
END $$;
