
-- Fix swapped args in SAF-T RLS policies (is_workspace_member expects user_id, workspace_id)

-- saft_imports
DROP POLICY IF EXISTS "ws members insert saft_imports" ON public.saft_imports;
DROP POLICY IF EXISTS "ws members read saft_imports" ON public.saft_imports;
DROP POLICY IF EXISTS "ws members update own saft_imports cancel" ON public.saft_imports;

CREATE POLICY "ws members read saft_imports"
  ON public.saft_imports FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "ws members insert saft_imports"
  ON public.saft_imports FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND uploaded_by = auth.uid());

CREATE POLICY "ws members update own saft_imports cancel"
  ON public.saft_imports FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- saft_import_items (if same pattern)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid='public.saft_import_items'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.saft_import_items', r.polname);
  END LOOP;
END $$;

CREATE POLICY "ws members read saft_import_items"
  ON public.saft_import_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.saft_imports si
    WHERE si.id = saft_import_items.import_id
      AND public.is_workspace_member(auth.uid(), si.workspace_id)
  ));

-- storage.objects policies for saft-imports bucket
DROP POLICY IF EXISTS "saft members insert storage" ON storage.objects;
DROP POLICY IF EXISTS "saft members read storage" ON storage.objects;
DROP POLICY IF EXISTS "saft members delete storage" ON storage.objects;

CREATE POLICY "saft members insert storage"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'saft-imports'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "saft members read storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'saft-imports'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "saft members delete storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'saft-imports'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
