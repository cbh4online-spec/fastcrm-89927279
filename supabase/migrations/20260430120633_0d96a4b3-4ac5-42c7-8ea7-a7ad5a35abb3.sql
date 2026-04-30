-- Permitir gestão de profile_menu_permissions e profile_field_permissions a:
--   • owner do workspace
--   • admin do workspace
--   • agency (gestão do workspace em modo agência)
--   • super_admin global (bypass)
-- Mantém SELECT para qualquer membro do workspace.

-- Tabela: profile_menu_permissions
DROP POLICY IF EXISTS manage_menu_perms_in_ws ON public.profile_menu_permissions;

CREATE POLICY manage_menu_perms_in_ws
ON public.profile_menu_permissions
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
  OR public.has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
  OR public.has_workspace_role(auth.uid(), workspace_id, 'agency'::workspace_role)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
  OR public.has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
  OR public.has_workspace_role(auth.uid(), workspace_id, 'agency'::workspace_role)
);

-- Tabela equivalente: profile_field_permissions (mesmo problema previsível)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='profile_field_permissions') THEN
    EXECUTE 'DROP POLICY IF EXISTS manage_field_perms_in_ws ON public.profile_field_permissions';
    EXECUTE $POL$
      CREATE POLICY manage_field_perms_in_ws
      ON public.profile_field_permissions
      FOR ALL
      TO authenticated
      USING (
        public.is_super_admin(auth.uid())
        OR public.has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
        OR public.has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
        OR public.has_workspace_role(auth.uid(), workspace_id, 'agency'::workspace_role)
      )
      WITH CHECK (
        public.is_super_admin(auth.uid())
        OR public.has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
        OR public.has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
        OR public.has_workspace_role(auth.uid(), workspace_id, 'agency'::workspace_role)
      )
    $POL$;
  END IF;
END $$;