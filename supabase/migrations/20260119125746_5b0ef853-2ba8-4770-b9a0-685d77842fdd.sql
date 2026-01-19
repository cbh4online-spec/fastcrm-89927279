-- Create table for contact LinkedIn data
CREATE TABLE public.contact_linkedin_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- LinkedIn company/personal profile data
  linkedin_url TEXT,
  description TEXT,
  tagline TEXT,
  headline TEXT,
  linkedin_industry TEXT,
  linkedin_type TEXT,
  company_size_range TEXT,
  headquarters TEXT,
  founded_year INTEGER,
  linkedin_website TEXT,
  
  -- Employee/Connection data
  employee_count_linkedin INTEGER,
  employees_on_linkedin INTEGER,
  connections_count INTEGER,
  
  -- Key people/contacts
  key_people JSONB DEFAULT '[]'::JSONB,
  
  -- Posts and engagement
  recent_posts JSONB DEFAULT '[]'::JSONB,
  last_post_date TIMESTAMP WITH TIME ZONE,
  posting_frequency TEXT,
  avg_likes_per_post INTEGER,
  avg_comments_per_post INTEGER,
  engagement_score INTEGER,
  
  -- Additional data
  specialties TEXT[],
  raw_data JSONB,
  
  -- Analysis metadata
  analysis_status TEXT DEFAULT 'pending',
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  analyzed_by TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT contact_linkedin_data_contact_id_key UNIQUE(contact_id)
);

-- Create table for lead LinkedIn data
CREATE TABLE public.lead_linkedin_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- LinkedIn profile data
  linkedin_url TEXT,
  description TEXT,
  tagline TEXT,
  headline TEXT,
  linkedin_industry TEXT,
  linkedin_type TEXT,
  company_size_range TEXT,
  headquarters TEXT,
  founded_year INTEGER,
  linkedin_website TEXT,
  
  -- Employee/Connection data
  employee_count_linkedin INTEGER,
  employees_on_linkedin INTEGER,
  connections_count INTEGER,
  
  -- Key people/contacts
  key_people JSONB DEFAULT '[]'::JSONB,
  
  -- Posts and engagement
  recent_posts JSONB DEFAULT '[]'::JSONB,
  last_post_date TIMESTAMP WITH TIME ZONE,
  posting_frequency TEXT,
  avg_likes_per_post INTEGER,
  avg_comments_per_post INTEGER,
  engagement_score INTEGER,
  
  -- Additional data
  specialties TEXT[],
  raw_data JSONB,
  
  -- Analysis metadata
  analysis_status TEXT DEFAULT 'pending',
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  analyzed_by TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT lead_linkedin_data_lead_id_key UNIQUE(lead_id)
);

-- Enable RLS
ALTER TABLE public.contact_linkedin_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_linkedin_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_linkedin_data
CREATE POLICY "Users can view contact LinkedIn data in their workspace" 
ON public.contact_linkedin_data 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert contact LinkedIn data in their workspace" 
ON public.contact_linkedin_data 
FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update contact LinkedIn data in their workspace" 
ON public.contact_linkedin_data 
FOR UPDATE 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete contact LinkedIn data in their workspace" 
ON public.contact_linkedin_data 
FOR DELETE 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- RLS policies for lead_linkedin_data
CREATE POLICY "Users can view lead LinkedIn data in their workspace" 
ON public.lead_linkedin_data 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert lead LinkedIn data in their workspace" 
ON public.lead_linkedin_data 
FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update lead LinkedIn data in their workspace" 
ON public.lead_linkedin_data 
FOR UPDATE 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete lead LinkedIn data in their workspace" 
ON public.lead_linkedin_data 
FOR DELETE 
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_contact_linkedin_data_contact_id ON public.contact_linkedin_data(contact_id);
CREATE INDEX idx_contact_linkedin_data_workspace_id ON public.contact_linkedin_data(workspace_id);
CREATE INDEX idx_lead_linkedin_data_lead_id ON public.lead_linkedin_data(lead_id);
CREATE INDEX idx_lead_linkedin_data_workspace_id ON public.lead_linkedin_data(workspace_id);