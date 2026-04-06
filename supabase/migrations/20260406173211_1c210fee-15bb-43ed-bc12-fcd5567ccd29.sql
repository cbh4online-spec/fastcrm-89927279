-- Bot reviewer profiles
CREATE TABLE public.bot_review_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  persona_prompt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_review_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage bot profiles"
  ON public.bot_review_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = bot_review_profiles.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = bot_review_profiles.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- Add source tracking to store_reviews
ALTER TABLE public.store_reviews
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS bot_profile_id UUID REFERENCES public.bot_review_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- Product Q&A table
CREATE TABLE public.product_qa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  source TEXT NOT NULL DEFAULT 'bot',
  bot_profile_id UUID REFERENCES public.bot_review_profiles(id) ON DELETE SET NULL,
  asker_name TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_qa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved QA"
  ON public.product_qa FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Workspace members can manage QA"
  ON public.product_qa FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = product_qa.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = product_qa.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE INDEX idx_product_qa_product ON public.product_qa(product_id);
CREATE INDEX idx_product_qa_approved ON public.product_qa(is_approved, product_id);

-- Bot comment generation jobs
CREATE TABLE public.bot_comment_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL DEFAULT 'manual',
  content_type TEXT NOT NULL DEFAULT 'both',
  status TEXT NOT NULL DEFAULT 'pending',
  reviews_count INT NOT NULL DEFAULT 3,
  qa_count INT NOT NULL DEFAULT 2,
  result_json JSONB,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.bot_comment_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage bot jobs"
  ON public.bot_comment_jobs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = bot_comment_jobs.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = bot_comment_jobs.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE INDEX idx_bot_comment_jobs_status ON public.bot_comment_jobs(status, workspace_id);

-- Triggers for updated_at
CREATE TRIGGER update_bot_review_profiles_updated_at
  BEFORE UPDATE ON public.bot_review_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_qa_updated_at
  BEFORE UPDATE ON public.product_qa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();