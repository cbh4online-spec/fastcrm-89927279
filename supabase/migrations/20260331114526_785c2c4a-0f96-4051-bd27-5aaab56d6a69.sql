
-- ============================================================
-- HR Recruitment Module — Phase 1: Schema
-- ============================================================

-- Enum for job opening status
CREATE TYPE public.hr_job_status AS ENUM ('draft', 'published', 'reviewing', 'closed', 'archived');

-- Enum for application stage
CREATE TYPE public.hr_application_stage AS ENUM ('new', 'screening', 'interview', 'test', 'offer', 'hired', 'rejected');

-- Enum for interview type
CREATE TYPE public.hr_interview_type AS ENUM ('in_person', 'remote', 'phone');

-- ──────────────────────────────────────────────────────────────
-- 1. hr_job_openings
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.hr_job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  job_type TEXT DEFAULT 'full_time',
  location TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  description TEXT,
  requirements TEXT,
  benefits TEXT,
  status public.hr_job_status NOT NULL DEFAULT 'draft',
  positions_count INT DEFAULT 1,
  created_by UUID,
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_job_openings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_job_openings_select" ON public.hr_job_openings
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_job_openings_insert" ON public.hr_job_openings
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_job_openings_update" ON public.hr_job_openings
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_job_openings_delete" ON public.hr_job_openings
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- 2. hr_candidates
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.hr_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  cv_path TEXT,
  cover_letter TEXT,
  source TEXT DEFAULT 'manual',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_candidates_select" ON public.hr_candidates
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_candidates_insert" ON public.hr_candidates
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_candidates_update" ON public.hr_candidates
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_candidates_delete" ON public.hr_candidates
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Public insert for application portal (anon)
CREATE POLICY "hr_candidates_anon_insert" ON public.hr_candidates
  FOR INSERT TO anon
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 3. hr_application_stages (configurable per workspace)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.hr_application_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  is_terminal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_application_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_application_stages_select" ON public.hr_application_stages
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_application_stages_insert" ON public.hr_application_stages
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_application_stages_update" ON public.hr_application_stages
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_application_stages_delete" ON public.hr_application_stages
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- 4. hr_applications
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.hr_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_opening_id UUID NOT NULL REFERENCES public.hr_job_openings(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.hr_candidates(id) ON DELETE CASCADE,
  stage public.hr_application_stage NOT NULL DEFAULT 'new',
  stage_id UUID REFERENCES public.hr_application_stages(id),
  rating INT CHECK (rating >= 0 AND rating <= 5),
  ai_score NUMERIC,
  ai_score_reasoning TEXT,
  rejection_reason TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  moved_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_applications_select" ON public.hr_applications
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_applications_insert" ON public.hr_applications
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_applications_update" ON public.hr_applications
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_applications_delete" ON public.hr_applications
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Anon insert for public portal
CREATE POLICY "hr_applications_anon_insert" ON public.hr_applications
  FOR INSERT TO anon
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 5. hr_interviews
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.hr_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  interview_type public.hr_interview_type NOT NULL DEFAULT 'remote',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60,
  location TEXT,
  meeting_url TEXT,
  interviewer_ids UUID[] DEFAULT '{}',
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_interviews_select" ON public.hr_interviews
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_interviews_insert" ON public.hr_interviews
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_interviews_update" ON public.hr_interviews
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_interviews_delete" ON public.hr_interviews
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- 6. hr_interview_scorecards
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.hr_interview_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES public.hr_interviews(id) ON DELETE CASCADE,
  interviewer_id UUID,
  criteria JSONB DEFAULT '[]',
  overall_rating INT CHECK (overall_rating >= 1 AND overall_rating <= 5),
  feedback TEXT,
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_interview_scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_interview_scorecards_select" ON public.hr_interview_scorecards
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_interview_scorecards_insert" ON public.hr_interview_scorecards
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_interview_scorecards_update" ON public.hr_interview_scorecards
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- 7. hr_candidate_notes
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.hr_candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.hr_candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.hr_applications(id) ON DELETE SET NULL,
  author_id UUID,
  note_type TEXT DEFAULT 'note',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_candidate_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_candidate_notes_select" ON public.hr_candidate_notes
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_candidate_notes_insert" ON public.hr_candidate_notes
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_candidate_notes_delete" ON public.hr_candidate_notes
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- 8. hr_recruitment_emails
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.hr_recruitment_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.hr_applications(id) ON DELETE SET NULL,
  candidate_id UUID NOT NULL REFERENCES public.hr_candidates(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL DEFAULT 'custom',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  generated_by_ai BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_recruitment_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_recruitment_emails_select" ON public.hr_recruitment_emails
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "hr_recruitment_emails_insert" ON public.hr_recruitment_emails
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- Storage bucket for CVs
-- ──────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('hr-cvs', 'hr-cvs', false, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "hr_cvs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'hr-cvs');

CREATE POLICY "hr_cvs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hr-cvs');

CREATE POLICY "hr_cvs_anon_insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'hr-cvs');

-- Indexes
CREATE INDEX idx_hr_job_openings_workspace ON public.hr_job_openings(workspace_id);
CREATE INDEX idx_hr_candidates_workspace ON public.hr_candidates(workspace_id);
CREATE INDEX idx_hr_applications_workspace ON public.hr_applications(workspace_id);
CREATE INDEX idx_hr_applications_job ON public.hr_applications(job_opening_id);
CREATE INDEX idx_hr_applications_candidate ON public.hr_applications(candidate_id);
CREATE INDEX idx_hr_interviews_application ON public.hr_interviews(application_id);
