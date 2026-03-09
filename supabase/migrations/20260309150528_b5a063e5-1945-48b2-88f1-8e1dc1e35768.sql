
-- Table to persist node positions on the Impact Map canvas
CREATE TABLE public.impact_map_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  node_key text NOT NULL, -- block id or "kind:entity_id"
  view_mode text NOT NULL DEFAULT 'context', -- 'context' or 'kernel'
  x double precision NOT NULL DEFAULT 0,
  y double precision NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, node_key, view_mode)
);

ALTER TABLE public.impact_map_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage positions in their workspace"
  ON public.impact_map_positions
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Table to persist simulation snapshots
CREATE TABLE public.impact_simulation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_block_id text NOT NULL,
  direction text NOT NULL DEFAULT 'downstream', -- 'downstream', 'upstream', 'bidirectional'
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.impact_simulation_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage simulation snapshots in their workspace"
  ON public.impact_simulation_snapshots
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );
