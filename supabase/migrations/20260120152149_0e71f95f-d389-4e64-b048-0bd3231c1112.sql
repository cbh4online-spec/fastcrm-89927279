-- Create client_requirements table for storing client needs/specs
CREATE TABLE public.client_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  category TEXT,
  requirements JSONB NOT NULL DEFAULT '{}',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view client requirements in their workspace"
ON public.client_requirements FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create client requirements in their workspace"
ON public.client_requirements FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update client requirements in their workspace"
ON public.client_requirements FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete client requirements in their workspace"
ON public.client_requirements FOR DELETE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- Add preferred_currency to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'EUR';

-- Add preferred_currency to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'EUR';

-- Create index for faster queries
CREATE INDEX idx_client_requirements_workspace ON public.client_requirements(workspace_id);
CREATE INDEX idx_client_requirements_company ON public.client_requirements(company_id);
CREATE INDEX idx_client_requirements_contact ON public.client_requirements(contact_id);
CREATE INDEX idx_client_requirements_opportunity ON public.client_requirements(opportunity_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_requirements_updated_at
BEFORE UPDATE ON public.client_requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();