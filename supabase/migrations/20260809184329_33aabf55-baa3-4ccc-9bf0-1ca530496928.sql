DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'menu_visibility') THEN
    CREATE TYPE public.menu_visibility AS ENUM ('visible','locked','hidden');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.workspace_menu_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('top_group','nav_group','route')),
  item_key text NOT NULL,
  visibility public.menu_visibility NOT NULL DEFAULT 'visible',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, item_type, item_key)
);

CREATE INDEX IF NOT EXISTS idx_wmo_workspace ON public.workspace_menu_overrides(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_menu_overrides TO authenticated;
GRANT ALL ON public.workspace_menu_overrides TO service_role;

ALTER TABLE public.workspace_menu_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read workspace menu overrides"
ON public.workspace_menu_overrides FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "super admin manage menu overrides"
ON public.workspace_menu_overrides FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_wmo_updated_at
BEFORE UPDATE ON public.workspace_menu_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();