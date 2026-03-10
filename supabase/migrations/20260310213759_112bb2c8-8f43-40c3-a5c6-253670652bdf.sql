CREATE TABLE IF NOT EXISTS public.funnel_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_event text NOT NULL,
  action_type text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  delay_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  config_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.funnel_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage funnel automations in their workspace"
  ON public.funnel_automations
  FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE id = funnel_automations.workspace_id
  ))
  WITH CHECK (workspace_id IN (
    SELECT id FROM public.workspaces WHERE id = funnel_automations.workspace_id
  ));