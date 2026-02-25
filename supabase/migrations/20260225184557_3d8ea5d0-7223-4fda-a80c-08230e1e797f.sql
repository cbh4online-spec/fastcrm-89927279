
-- Create report_dashboards table
CREATE TABLE public.report_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.report_dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dashboards in their workspace"
  ON public.report_dashboards FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create dashboards in their workspace"
  ON public.report_dashboards FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update dashboards in their workspace"
  ON public.report_dashboards FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete dashboards in their workspace"
  ON public.report_dashboards FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Create report_widgets table
CREATE TABLE public.report_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.report_dashboards(id) ON DELETE CASCADE,
  title text NOT NULL,
  chart_type text NOT NULL DEFAULT 'bar',
  dataset text NOT NULL DEFAULT 'deals',
  metric text NOT NULL DEFAULT 'count',
  value_field text,
  group_by text NOT NULL DEFAULT 'month',
  filters jsonb DEFAULT '{}',
  layout_order integer DEFAULT 0,
  layout_size text DEFAULT 'md',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.report_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view widgets via dashboard workspace"
  ON public.report_widgets FOR SELECT
  USING (dashboard_id IN (
    SELECT id FROM report_dashboards WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can create widgets via dashboard workspace"
  ON public.report_widgets FOR INSERT
  WITH CHECK (dashboard_id IN (
    SELECT id FROM report_dashboards WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update widgets via dashboard workspace"
  ON public.report_widgets FOR UPDATE
  USING (dashboard_id IN (
    SELECT id FROM report_dashboards WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete widgets via dashboard workspace"
  ON public.report_widgets FOR DELETE
  USING (dashboard_id IN (
    SELECT id FROM report_dashboards WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));
