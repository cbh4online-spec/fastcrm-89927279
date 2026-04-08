
-- Worker profiles (public registration)
CREATE TABLE public.portal_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  location TEXT,
  sector TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  education TEXT,
  bio TEXT,
  cv_url TEXT,
  linkedin_url TEXT,
  photo_url TEXT,
  availability TEXT DEFAULT 'immediate' CHECK (availability IN ('immediate', '2_weeks', '1_month', '3_months', 'negotiable')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, auth_user_id)
);

ALTER TABLE public.portal_workers ENABLE ROW LEVEL SECURITY;

-- Public can view active workers
CREATE POLICY "Anyone can view active workers"
  ON public.portal_workers FOR SELECT
  USING (status = 'active');

-- Workers manage their own profile
CREATE POLICY "Workers can insert own profile"
  ON public.portal_workers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Workers can update own profile"
  ON public.portal_workers FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Workers can delete own profile"
  ON public.portal_workers FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Worker availability listings
CREATE TABLE public.portal_worker_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_worker_id UUID NOT NULL REFERENCES public.portal_workers(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'freelance', 'internship')),
  remote_option TEXT DEFAULT 'onsite' CHECK (remote_option IN ('onsite', 'remote', 'hybrid')),
  desired_location TEXT,
  desired_salary_range TEXT,
  available_from DATE,
  is_immediate BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_worker_listings ENABLE ROW LEVEL SECURITY;

-- Public can view active listings
CREATE POLICY "Anyone can view active worker listings"
  ON public.portal_worker_listings FOR SELECT
  USING (status = 'active');

-- Workers manage own listings (via portal_worker_id ownership)
CREATE POLICY "Workers can insert own listings"
  ON public.portal_worker_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portal_workers
      WHERE id = portal_worker_id AND auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can update own listings"
  ON public.portal_worker_listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_workers
      WHERE id = portal_worker_id AND auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can delete own listings"
  ON public.portal_worker_listings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_workers
      WHERE id = portal_worker_id AND auth_user_id = auth.uid()
    )
  );

-- Timestamp triggers
CREATE TRIGGER update_portal_workers_updated_at
  BEFORE UPDATE ON public.portal_workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portal_worker_listings_updated_at
  BEFORE UPDATE ON public.portal_worker_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
