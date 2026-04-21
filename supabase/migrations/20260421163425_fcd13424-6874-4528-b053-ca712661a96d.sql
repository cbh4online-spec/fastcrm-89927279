
-- 1) Drop antigos constraints globais
ALTER TABLE public.profile_menu_permissions
  DROP CONSTRAINT IF EXISTS profile_menu_permissions_sales_function_menu_key_key;
ALTER TABLE public.profile_field_permissions
  DROP CONSTRAINT IF EXISTS profile_field_permissions_sales_function_page_key_field_key_key;

-- 2) Add workspace_id
ALTER TABLE public.profile_menu_permissions
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.profile_field_permissions
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 3) Backfill com workspace mais antigo
DO $$
DECLARE default_ws uuid;
BEGIN
  SELECT id INTO default_ws FROM public.workspaces ORDER BY created_at ASC LIMIT 1;
  IF default_ws IS NOT NULL THEN
    UPDATE public.profile_menu_permissions SET workspace_id = default_ws WHERE workspace_id IS NULL;
    UPDATE public.profile_field_permissions SET workspace_id = default_ws WHERE workspace_id IS NULL;
  ELSE
    DELETE FROM public.profile_menu_permissions WHERE workspace_id IS NULL;
    DELETE FROM public.profile_field_permissions WHERE workspace_id IS NULL;
  END IF;
END $$;

-- 4) NOT NULL
ALTER TABLE public.profile_menu_permissions ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.profile_field_permissions ALTER COLUMN workspace_id SET NOT NULL;

-- 5) Indices únicos compostos
CREATE UNIQUE INDEX IF NOT EXISTS profile_menu_perm_ws_fn_menu_uk
  ON public.profile_menu_permissions (workspace_id, sales_function, menu_key);
CREATE UNIQUE INDEX IF NOT EXISTS profile_field_perm_ws_fn_page_field_uk
  ON public.profile_field_permissions (workspace_id, sales_function, page_key, field_key);

-- 6) RLS
ALTER TABLE public.profile_menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_field_permissions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profile_menu_permissions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profile_menu_permissions', p.policyname);
  END LOOP;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profile_field_permissions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profile_field_permissions', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "view_menu_perms_in_ws" ON public.profile_menu_permissions
  FOR SELECT USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "view_field_perms_in_ws" ON public.profile_field_permissions
  FOR SELECT USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "manage_menu_perms_in_ws" ON public.profile_menu_permissions
  FOR ALL
  USING (
    has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
    OR has_workspace_role(workspace_id, auth.uid(), 'admin'::workspace_role)
  )
  WITH CHECK (
    has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
    OR has_workspace_role(workspace_id, auth.uid(), 'admin'::workspace_role)
  );

CREATE POLICY "manage_field_perms_in_ws" ON public.profile_field_permissions
  FOR ALL
  USING (
    has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
    OR has_workspace_role(workspace_id, auth.uid(), 'admin'::workspace_role)
  )
  WITH CHECK (
    has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
    OR has_workspace_role(workspace_id, auth.uid(), 'admin'::workspace_role)
  );
