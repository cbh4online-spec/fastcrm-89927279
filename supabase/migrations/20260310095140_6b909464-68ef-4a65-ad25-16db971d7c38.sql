DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT DISTINCT p.tablename
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (p.qual::text LIKE '%workspace_members%' OR p.with_check::text LIKE '%workspace_members%')
      AND p.tablename NOT IN (
        SELECT DISTINCT p2.tablename
        FROM pg_policies p2
        WHERE p2.schemaname = 'public'
          AND (p2.qual::text LIKE '%is_super_admin%' OR p2.with_check::text LIKE '%is_super_admin%')
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Super admin full access" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "Super admin full access" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()))',
      tbl
    );
  END LOOP;
END;
$$;