-- ─── workspace_department_overrides ────────────────────────────────────────
-- Controla visibilidade de cada departamento por workspace.
-- Cruza com o mapping plano→departamentos no client (departments.ts).

CREATE TABLE IF NOT EXISTS public.workspace_department_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  department_slug text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  locked_by_plan boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (workspace_id, department_slug)
);

CREATE INDEX IF NOT EXISTS idx_wdo_workspace
  ON public.workspace_department_overrides(workspace_id);

-- updated_at trigger
CREATE TRIGGER trg_wdo_updated_at
  BEFORE UPDATE ON public.workspace_department_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.workspace_department_overrides ENABLE ROW LEVEL SECURITY;

-- SELECT: membros do workspace + super admin
CREATE POLICY "wdo_select_members"
  ON public.workspace_department_overrides
  FOR SELECT
  TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- INSERT: apenas owners/admins do workspace + super admin
CREATE POLICY "wdo_insert_admins"
  ON public.workspace_department_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_workspace_admin(workspace_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- UPDATE: apenas owners/admins + super admin
CREATE POLICY "wdo_update_admins"
  ON public.workspace_department_overrides
  FOR UPDATE
  TO authenticated
  USING (
    public.is_workspace_admin(workspace_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    public.is_workspace_admin(workspace_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- DELETE: apenas owners/admins + super admin
CREATE POLICY "wdo_delete_admins"
  ON public.workspace_department_overrides
  FOR DELETE
  TO authenticated
  USING (
    public.is_workspace_admin(workspace_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );
