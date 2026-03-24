
-- =============================================
-- Account Brief Module — Phase 1 Tables
-- =============================================

-- Enum for commercial status
CREATE TYPE public.account_brief_commercial_status AS ENUM (
  'new', 'researching', 'outreach_ready', 'contacted', 'follow_up'
);

-- Enum for analysis run status
CREATE TYPE public.account_brief_run_status AS ENUM (
  'queued', 'processing', 'completed', 'partial', 'failed'
);

-- 1. Module workspace config
CREATE TABLE public.account_brief_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed_at TIMESTAMPTZ,
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.account_brief_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own workspace config"
  ON public.account_brief_workspaces FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can insert own workspace config"
  ON public.account_brief_workspaces FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can update own workspace config"
  ON public.account_brief_workspaces FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 2. Company profile (the user's own company)
CREATE TABLE public.account_brief_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_name TEXT,
  team_type TEXT, -- founder-led, sdr-bdr, agency, consultancy
  selling_sector TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.account_brief_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own profile"
  ON public.account_brief_profiles FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 3. ICP profiles
CREATE TABLE public.account_brief_icp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_type TEXT,
  industry TEXT,
  geography TEXT,
  size_band TEXT,
  notes TEXT,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_icp_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own ICP"
  ON public.account_brief_icp_profiles FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 4. Target accounts (central entity)
CREATE TABLE public.account_brief_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID, -- optional link to companies table
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  normalized_domain TEXT NOT NULL,
  probable_sector TEXT,
  probable_geography TEXT,
  executive_summary TEXT,
  description_short TEXT,
  tagline TEXT,
  total_score INTEGER DEFAULT 0,
  score_label TEXT DEFAULT 'Baixo',
  favorite BOOLEAN DEFAULT false,
  commercial_status public.account_brief_commercial_status DEFAULT 'new',
  last_analysis_at TIMESTAMPTZ,
  last_analysis_run_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_ab_accounts_workspace ON public.account_brief_accounts(workspace_id);
CREATE INDEX idx_ab_accounts_domain ON public.account_brief_accounts(workspace_id, normalized_domain);

ALTER TABLE public.account_brief_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own accounts"
  ON public.account_brief_accounts FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 5. Notes
CREATE TABLE public.account_brief_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  author_user_id UUID,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own notes"
  ON public.account_brief_notes FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 6. Analysis runs
CREATE TABLE public.account_brief_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  trigger_type TEXT DEFAULT 'manual',
  status public.account_brief_run_status DEFAULT 'queued',
  pages_discovered INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  pages_failed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  correlation_id TEXT,
  error_summary TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ab_runs_account ON public.account_brief_analysis_runs(account_id);

ALTER TABLE public.account_brief_analysis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own runs"
  ON public.account_brief_analysis_runs FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Phase 2 tables (URLs, Pages, Snapshots, Errors)

-- 7. Discovered/manual URLs
CREATE TABLE public.account_brief_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  page_type TEXT, -- homepage, about, products, pricing, careers, etc.
  discovery_method TEXT DEFAULT 'auto', -- auto, manual
  is_manual BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own URLs"
  ON public.account_brief_urls FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 8. Processed pages
CREATE TABLE public.account_brief_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  url_id UUID REFERENCES public.account_brief_urls(id) ON DELETE SET NULL,
  final_url TEXT,
  title TEXT,
  page_type TEXT,
  http_status INTEGER,
  crawl_status TEXT DEFAULT 'pending', -- pending, success, error
  raw_text TEXT,
  cleaned_text TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own pages"
  ON public.account_brief_pages FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 9. Page snapshots
CREATE TABLE public.account_brief_page_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.account_brief_pages(id) ON DELETE CASCADE,
  snapshot_hash TEXT,
  snapshot_text TEXT,
  extracted_structured_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_page_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own snapshots"
  ON public.account_brief_page_snapshots FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 10. Analysis errors
CREATE TABLE public.account_brief_analysis_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  analysis_run_id UUID REFERENCES public.account_brief_analysis_runs(id) ON DELETE CASCADE,
  url_id UUID REFERENCES public.account_brief_urls(id) ON DELETE SET NULL,
  step_name TEXT,
  error_type TEXT,
  error_message TEXT,
  retryable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_analysis_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own errors"
  ON public.account_brief_analysis_errors FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Phase 3 tables (Briefs, Scores, Score Factors, Public Contacts)

-- 11. Briefings
CREATE TABLE public.account_brief_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  analysis_run_id UUID REFERENCES public.account_brief_analysis_runs(id) ON DELETE SET NULL,
  identity_json JSONB DEFAULT '{}'::jsonb,
  offer_json JSONB DEFAULT '{}'::jsonb,
  signals_json JSONB DEFAULT '{}'::jsonb,
  personalization_json JSONB DEFAULT '{}'::jsonb,
  outreach_json JSONB DEFAULT '{}'::jsonb,
  executive_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own briefs"
  ON public.account_brief_briefs FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 12. Scores
CREATE TABLE public.account_brief_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  analysis_run_id UUID REFERENCES public.account_brief_analysis_runs(id) ON DELETE SET NULL,
  total_score INTEGER DEFAULT 0,
  score_label TEXT DEFAULT 'Baixo',
  icp_fit_score INTEGER DEFAULT 0,
  growth_score INTEGER DEFAULT 0,
  maturity_score INTEGER DEFAULT 0,
  personalization_score INTEGER DEFAULT 0,
  reasoning_short TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own scores"
  ON public.account_brief_scores FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 13. Score factors
CREATE TABLE public.account_brief_score_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  analysis_run_id UUID REFERENCES public.account_brief_analysis_runs(id) ON DELETE SET NULL,
  factor_type TEXT NOT NULL, -- icp_fit, growth, maturity, personalization
  factor_label TEXT NOT NULL,
  factor_value NUMERIC,
  factor_weight NUMERIC DEFAULT 1,
  polarity TEXT DEFAULT 'positive', -- positive, negative
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_score_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own factors"
  ON public.account_brief_score_factors FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 14. Public contacts found
CREATE TABLE public.account_brief_public_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  contact_name TEXT,
  role_title TEXT,
  email TEXT,
  linkedin_url TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_public_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own contacts"
  ON public.account_brief_public_contacts FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Phase 4 tables

-- 15. Account sources
CREATE TABLE public.account_brief_account_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  source_type TEXT,
  source_value TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_account_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own sources"
  ON public.account_brief_account_sources FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 16. Diff events between runs
CREATE TABLE public.account_brief_diff_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  current_run_id UUID REFERENCES public.account_brief_analysis_runs(id) ON DELETE SET NULL,
  previous_run_id UUID REFERENCES public.account_brief_analysis_runs(id) ON DELETE SET NULL,
  diff_type TEXT NOT NULL,
  diff_label TEXT,
  diff_payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_diff_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own diffs"
  ON public.account_brief_diff_events FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
