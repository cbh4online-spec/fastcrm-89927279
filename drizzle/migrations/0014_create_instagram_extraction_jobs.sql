CREATE TABLE public.instagram_extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  created_by uuid,
  source text NOT NULL,
  target text NOT NULL,
  limit_count integer NOT NULL DEFAULT 200,
  status text NOT NULL DEFAULT 'pending',
  queued_count integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  found_count integer NOT NULL DEFAULT 0,
  next_cursor text,
  listing_done boolean NOT NULL DEFAULT false,
  error text,
  lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CONSTRAINT instagram_extraction_jobs_source_check CHECK (source IN ('followers','following','hashtag','location','list')),
  CONSTRAINT instagram_extraction_jobs_status_check CHECK (status IN ('pending','running','paused','completed','failed','cancelled')),
  CONSTRAINT instagram_extraction_jobs_limit_check CHECK (limit_count > 0 AND limit_count <= 20000)
);

GRANT SELECT ON public.instagram_extraction_jobs TO authenticated;
GRANT ALL ON public.instagram_extraction_jobs TO service_role;
ALTER TABLE public.instagram_extraction_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read extraction jobs"
  ON public.instagram_extraction_jobs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX idx_ig_extraction_jobs_ws ON public.instagram_extraction_jobs (workspace_id, created_at DESC);
CREATE INDEX idx_ig_extraction_jobs_status ON public.instagram_extraction_jobs (status, lease_until);

CREATE TABLE public.instagram_extraction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.instagram_extraction_jobs(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  username text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  error text,
  profile_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT instagram_extraction_items_status_check CHECK (status IN ('pending','done','failed','skipped')),
  CONSTRAINT instagram_extraction_items_unique UNIQUE (job_id, username)
);

GRANT SELECT ON public.instagram_extraction_items TO authenticated;
GRANT ALL ON public.instagram_extraction_items TO service_role;
ALTER TABLE public.instagram_extraction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read extraction items"
  ON public.instagram_extraction_items FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX idx_ig_extraction_items_job ON public.instagram_extraction_items (job_id, status);

ALTER TABLE public.professional_prospecting_profiles
  ADD COLUMN IF NOT EXISTS extraction_job_id uuid REFERENCES public.instagram_extraction_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instagram_username text,
  ADD COLUMN IF NOT EXISTS is_private boolean;

CREATE INDEX IF NOT EXISTS idx_ppp_extraction_job ON public.professional_prospecting_profiles (extraction_job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ppp_ws_ig_username ON public.professional_prospecting_profiles (workspace_id, instagram_username) WHERE instagram_username IS NOT NULL;