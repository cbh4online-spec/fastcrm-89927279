-- Add new fields to company_linkedin_data for enhanced analysis
ALTER TABLE public.company_linkedin_data
ADD COLUMN IF NOT EXISTS followers_count integer,
ADD COLUMN IF NOT EXISTS suggested_contacts jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS data_suggestions jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS activity_level text,
ADD COLUMN IF NOT EXISTS posts_per_month numeric;

-- Create company_facebook_data table
CREATE TABLE IF NOT EXISTS public.company_facebook_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  facebook_url text,
  followers_count integer,
  likes_count integer,
  rating numeric,
  reviews_count integer,
  about_text text,
  page_category text,
  activity_level text,
  last_post_date timestamp with time zone,
  posts_per_month numeric,
  analysis_status text DEFAULT 'pending',
  error_message text,
  raw_data jsonb,
  analyzed_at timestamp with time zone DEFAULT now(),
  analyzed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_facebook_data_company_id_unique UNIQUE (company_id)
);

-- Create company_instagram_data table
CREATE TABLE IF NOT EXISTS public.company_instagram_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instagram_url text,
  followers_count integer,
  following_count integer,
  posts_count integer,
  avg_likes_per_post numeric,
  avg_comments_per_post numeric,
  engagement_rate numeric,
  content_type text,
  bio text,
  activity_level text,
  last_post_date timestamp with time zone,
  posts_per_month numeric,
  analysis_status text DEFAULT 'pending',
  error_message text,
  raw_data jsonb,
  analyzed_at timestamp with time zone DEFAULT now(),
  analyzed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_instagram_data_company_id_unique UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE public.company_facebook_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_instagram_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_facebook_data
CREATE POLICY "Users can view facebook data in their workspace"
  ON public.company_facebook_data
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert facebook data in their workspace"
  ON public.company_facebook_data
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update facebook data in their workspace"
  ON public.company_facebook_data
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete facebook data in their workspace"
  ON public.company_facebook_data
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- RLS policies for company_instagram_data
CREATE POLICY "Users can view instagram data in their workspace"
  ON public.company_instagram_data
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert instagram data in their workspace"
  ON public.company_instagram_data
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update instagram data in their workspace"
  ON public.company_instagram_data
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete instagram data in their workspace"
  ON public.company_instagram_data
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );