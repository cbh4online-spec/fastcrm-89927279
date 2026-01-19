-- Create table for tracking company enrichment history
CREATE TABLE public.company_enrichment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  enriched_by UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',
  fields_suggested JSONB NOT NULL DEFAULT '{}',
  fields_applied JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.company_enrichment_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view enrichment logs in their workspace"
ON public.company_enrichment_logs
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create enrichment logs in their workspace"
ON public.company_enrichment_logs
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_company_enrichment_logs_company_id ON public.company_enrichment_logs(company_id);
CREATE INDEX idx_company_enrichment_logs_workspace_id ON public.company_enrichment_logs(workspace_id);