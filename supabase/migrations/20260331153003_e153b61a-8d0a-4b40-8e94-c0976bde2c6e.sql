
-- Table
CREATE TABLE public.hr_country_labor_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  rules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, country_code)
);

-- RLS
ALTER TABLE public.hr_country_labor_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view labor rules"
  ON public.hr_country_labor_rules FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert labor rules"
  ON public.hr_country_labor_rules FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update labor rules"
  ON public.hr_country_labor_rules FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete labor rules"
  ON public.hr_country_labor_rules FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );
