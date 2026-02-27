
-- Business Context table for Context OS (Base Layer)
CREATE TABLE public.business_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  business_model TEXT,
  business_description TEXT,
  icp_description TEXT,
  icp_industries TEXT[],
  icp_company_size TEXT,
  icp_decision_maker TEXT,
  icp_pain_points TEXT[],
  offers JSONB DEFAULT '[]'::jsonb,
  pricing_model TEXT,
  average_ticket NUMERIC,
  sales_process_steps TEXT[],
  sales_cycle_days INTEGER,
  objections_common TEXT[],
  scripts JSONB DEFAULT '[]'::jsonb,
  follow_up_sla_hours INTEGER DEFAULT 24,
  monthly_revenue_target NUMERIC,
  quarterly_revenue_target NUMERIC,
  annual_revenue_target NUMERIC,
  deals_target_monthly INTEGER,
  team_size INTEGER,
  team_roles TEXT[],
  active_strategies TEXT[],
  onboarding_completed BOOLEAN DEFAULT false,
  last_updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.business_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view business_context"
  ON public.business_context FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage business_context"
  ON public.business_context FOR ALL TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ));

CREATE POLICY "Super admin bypass business_context"
  ON public.business_context FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));
