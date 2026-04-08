
-- Portal Companies
CREATE TABLE public.portal_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  website text DEFAULT '',
  logo_url text,
  nif text,
  sector text,
  location text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, auth_user_id)
);

ALTER TABLE public.portal_companies ENABLE ROW LEVEL SECURITY;

-- Public can view active companies
CREATE POLICY "Public can view active portal companies"
ON public.portal_companies FOR SELECT TO anon, authenticated
USING (status = 'active');

-- Company owner can view own record regardless of status
CREATE POLICY "Company owner can view own record"
ON public.portal_companies FOR SELECT TO authenticated
USING (auth.uid() = auth_user_id);

-- Company owner can update own record
CREATE POLICY "Company owner can update own record"
ON public.portal_companies FOR UPDATE TO authenticated
USING (auth.uid() = auth_user_id);

-- Authenticated users can insert (register)
CREATE POLICY "Authenticated users can register company"
ON public.portal_companies FOR INSERT TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

-- Workspace members can manage all
CREATE POLICY "Workspace members can manage portal companies"
ON public.portal_companies FOR ALL TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

-- Portal Job Postings
CREATE TABLE public.portal_job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_company_id uuid NOT NULL REFERENCES public.portal_companies(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text,
  employment_type text DEFAULT 'full_time',
  remote_option text DEFAULT 'office',
  salary_range text,
  requirements text[] DEFAULT '{}',
  contact_email text,
  status text NOT NULL DEFAULT 'pending',
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_job_postings ENABLE ROW LEVEL SECURITY;

-- Public can view active published portal jobs
CREATE POLICY "Public can view active portal jobs"
ON public.portal_job_postings FOR SELECT TO anon, authenticated
USING (status = 'active' AND published_at IS NOT NULL);

-- Company owner can manage own jobs
CREATE POLICY "Company owner can view own jobs"
ON public.portal_job_postings FOR SELECT TO authenticated
USING (portal_company_id IN (SELECT id FROM public.portal_companies WHERE auth_user_id = auth.uid()));

CREATE POLICY "Company owner can insert jobs"
ON public.portal_job_postings FOR INSERT TO authenticated
WITH CHECK (portal_company_id IN (SELECT id FROM public.portal_companies WHERE auth_user_id = auth.uid()));

CREATE POLICY "Company owner can update own jobs"
ON public.portal_job_postings FOR UPDATE TO authenticated
USING (portal_company_id IN (SELECT id FROM public.portal_companies WHERE auth_user_id = auth.uid()));

-- Workspace members can manage all
CREATE POLICY "Workspace members can manage portal jobs"
ON public.portal_job_postings FOR ALL TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_portal_companies_updated_at
BEFORE UPDATE ON public.portal_companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portal_job_postings_updated_at
BEFORE UPDATE ON public.portal_job_postings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
