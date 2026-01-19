-- Create table to store LinkedIn analysis data for companies
CREATE TABLE public.company_linkedin_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- About page data
  linkedin_url TEXT,
  description TEXT,
  tagline TEXT,
  headquarters TEXT,
  founded_year INTEGER,
  company_size_range TEXT,
  linkedin_industry TEXT,
  linkedin_type TEXT,
  specialties TEXT[],
  linkedin_website TEXT,
  
  -- People data
  employee_count_linkedin INTEGER,
  employees_on_linkedin INTEGER,
  key_people JSONB DEFAULT '[]',
  
  -- Posts data
  recent_posts JSONB DEFAULT '[]',
  avg_likes_per_post NUMERIC,
  avg_comments_per_post NUMERIC,
  posting_frequency TEXT,
  last_post_date TIMESTAMP WITH TIME ZONE,
  engagement_score NUMERIC,
  
  -- Metadata
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analyzed_by UUID,
  analysis_status TEXT DEFAULT 'pending',
  error_message TEXT,
  raw_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_linkedin_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view linkedin data in their workspace" 
ON public.company_linkedin_data 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = company_linkedin_data.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert linkedin data in their workspace" 
ON public.company_linkedin_data 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = company_linkedin_data.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update linkedin data in their workspace" 
ON public.company_linkedin_data 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = company_linkedin_data.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete linkedin data in their workspace" 
ON public.company_linkedin_data 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = company_linkedin_data.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_company_linkedin_data_updated_at
BEFORE UPDATE ON public.company_linkedin_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_company_linkedin_data_company_id ON public.company_linkedin_data(company_id);
CREATE INDEX idx_company_linkedin_data_workspace_id ON public.company_linkedin_data(workspace_id);