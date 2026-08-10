CREATE TABLE IF NOT EXISTS public.ghl_sync_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sync_type text NOT NULL,
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  partial_runs integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sync_type)
);

CREATE INDEX IF NOT EXISTS idx_ghl_sync_cursors_workspace ON public.ghl_sync_cursors(workspace_id);

GRANT SELECT ON public.ghl_sync_cursors TO authenticated;
GRANT ALL ON public.ghl_sync_cursors TO service_role;

ALTER TABLE public.ghl_sync_cursors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view ghl sync cursors" ON public.ghl_sync_cursors;
CREATE POLICY "Workspace members can view ghl sync cursors"
  ON public.ghl_sync_cursors FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));