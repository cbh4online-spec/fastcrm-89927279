-- Create forms table
CREATE TABLE public.forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  form_type TEXT NOT NULL DEFAULT 'lead_capture',
  schema JSONB NOT NULL DEFAULT '{"fields": []}'::jsonb,
  scoring_rules JSONB DEFAULT '[]'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  automation_config JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  is_conversational BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_internal BOOLEAN DEFAULT false,
  slug TEXT UNIQUE,
  submission_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create form submissions table
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  enriched_data JSONB DEFAULT '{}'::jsonb,
  score INTEGER DEFAULT 0,
  temperature TEXT DEFAULT 'cold',
  ai_summary TEXT,
  ai_next_action TEXT,
  lead_id UUID REFERENCES public.leads(id),
  contact_id UUID REFERENCES public.contacts(id),
  company_id UUID REFERENCES public.companies(id),
  opportunity_id UUID REFERENCES public.opportunities(id),
  ip_address TEXT,
  user_agent TEXT,
  location_data JSONB DEFAULT '{}'::jsonb,
  processing_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Forms policies
CREATE POLICY "Users can view forms in their workspace"
ON public.forms FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create forms in their workspace"
ON public.forms FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update forms in their workspace"
ON public.forms FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete forms in their workspace"
ON public.forms FOR DELETE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- Form submissions policies
CREATE POLICY "Users can view submissions in their workspace"
ON public.form_submissions FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create submissions in their workspace"
ON public.form_submissions FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update submissions in their workspace"
ON public.form_submissions FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- Allow public form submissions (for external forms)
CREATE POLICY "Anyone can submit to active public forms"
ON public.form_submissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.forms 
    WHERE forms.id = form_id 
    AND forms.is_active = true 
    AND forms.is_internal = false
  )
);

-- Create indexes
CREATE INDEX idx_forms_workspace ON public.forms(workspace_id);
CREATE INDEX idx_forms_slug ON public.forms(slug);
CREATE INDEX idx_form_submissions_form ON public.form_submissions(form_id);
CREATE INDEX idx_form_submissions_workspace ON public.form_submissions(workspace_id);
CREATE INDEX idx_form_submissions_created ON public.form_submissions(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_forms_updated_at
BEFORE UPDATE ON public.forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();