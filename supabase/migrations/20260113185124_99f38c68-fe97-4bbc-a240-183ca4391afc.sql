-- Create pipeline_stages table for configurable stages per workspace
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value DECIMAL(12, 2) DEFAULT 0,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Pipeline stages policies
CREATE POLICY "Members can view pipeline stages"
  ON public.pipeline_stages FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage pipeline stages"
  ON public.pipeline_stages FOR INSERT
  WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can update pipeline stages"
  ON public.pipeline_stages FOR UPDATE
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete pipeline stages"
  ON public.pipeline_stages FOR DELETE
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Leads policies
CREATE POLICY "Members can view leads"
  ON public.leads FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can create leads"
  ON public.leads FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Members can update leads"
  ON public.leads FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete leads"
  ON public.leads FOR DELETE
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Opportunities policies
CREATE POLICY "Members can view opportunities"
  ON public.opportunities FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can create opportunities"
  ON public.opportunities FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = owner_id);

CREATE POLICY "Members can update opportunities"
  ON public.opportunities FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete opportunities"
  ON public.opportunities FOR DELETE
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Triggers for updated_at
CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_leads_workspace_id ON public.leads(workspace_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_opportunities_workspace_id ON public.opportunities(workspace_id);
CREATE INDEX idx_opportunities_stage_id ON public.opportunities(stage_id);
CREATE INDEX idx_pipeline_stages_workspace_id ON public.pipeline_stages(workspace_id);