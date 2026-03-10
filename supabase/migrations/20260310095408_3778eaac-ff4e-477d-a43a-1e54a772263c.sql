
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT p.tablename
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename NOT IN (
        SELECT DISTINCT p2.tablename
        FROM pg_policies p2
        WHERE p2.schemaname = 'public'
          AND p2.policyname = 'Super admin full access'
      )
      AND EXISTS (
        SELECT 1 FROM pg_policies p3
        WHERE p3.schemaname = 'public'
          AND p3.tablename = p.tablename
      )
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "Super admin full access" ON public.%I', r.tablename);
      EXECUTE format(
        'CREATE POLICY "Super admin full access" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()))',
        r.tablename
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped table %: %', r.tablename, SQLERRM;
    END;
  END LOOP;
END;
$$;
