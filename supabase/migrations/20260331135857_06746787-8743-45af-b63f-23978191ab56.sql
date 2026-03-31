
-- ===================================================
-- Step 1: Drop old recruitment tables (CASCADE removes FKs)
-- ===================================================
DROP TABLE IF EXISTS hr_recruitment_emails CASCADE;
DROP TABLE IF EXISTS hr_candidate_notes CASCADE;
DROP TABLE IF EXISTS hr_interview_scorecards CASCADE;
DROP TABLE IF EXISTS hr_interviews CASCADE;
DROP TABLE IF EXISTS hr_applications CASCADE;
DROP TABLE IF EXISTS hr_application_stages CASCADE;
DROP TABLE IF EXISTS hr_job_openings CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS hr_application_stage CASCADE;
DROP TYPE IF EXISTS hr_interview_type CASCADE;
DROP TYPE IF EXISTS hr_job_status CASCADE;

-- ===================================================
-- Step 2: Drop old hr_candidates entirely and recreate
-- ===================================================
DROP TABLE IF EXISTS hr_candidates CASCADE;

-- ===================================================
-- Step 3: Create hr_job_postings
-- ===================================================
CREATE TABLE hr_job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  department_id UUID REFERENCES hr_departments(id),
  
  employment_type TEXT DEFAULT 'full_time',
  location TEXT,
  remote_option TEXT DEFAULT 'office',
  
  salary_min INTEGER,
  salary_max INTEGER,
  currency TEXT DEFAULT 'EUR',
  
  requirements TEXT[] DEFAULT '{}',
  nice_to_have TEXT[] DEFAULT '{}',
  
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  
  slug TEXT,
  public_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Validation trigger for employment_type
CREATE OR REPLACE FUNCTION validate_hr_job_posting_employment_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employment_type IS NOT NULL AND NEW.employment_type NOT IN ('full_time', 'part_time', 'contract', 'intern') THEN
    RAISE EXCEPTION 'Invalid employment_type: %', NEW.employment_type;
  END IF;
  IF NEW.remote_option IS NOT NULL AND NEW.remote_option NOT IN ('office', 'remote', 'hybrid') THEN
    RAISE EXCEPTION 'Invalid remote_option: %', NEW.remote_option;
  END IF;
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('draft', 'active', 'closed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_hr_job_posting
  BEFORE INSERT OR UPDATE ON hr_job_postings
  FOR EACH ROW EXECUTE FUNCTION validate_hr_job_posting_employment_type();

CREATE TRIGGER update_hr_job_postings_updated_at
  BEFORE UPDATE ON hr_job_postings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================
-- Step 4: Create hr_candidates (new structure)
-- ===================================================
CREATE TABLE hr_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_posting_id UUID REFERENCES hr_job_postings(id),
  
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'manual',
  referrer_id UUID,
  
  cv_url TEXT,
  cv_parsed_data JSONB,
  cover_letter_url TEXT,
  portfolio_url TEXT,
  
  linkedin_url TEXT,
  github_url TEXT,
  avatar_url TEXT,
  
  stage TEXT DEFAULT 'new',
  
  ai_score INTEGER,
  ai_analysis JSONB,
  
  status TEXT DEFAULT 'active',
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation trigger for candidate
CREATE OR REPLACE FUNCTION validate_hr_candidate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage IS NOT NULL AND NEW.stage NOT IN (
    'new', 'screening', 'phone_interview', 'technical_interview', 
    'onsite_interview', 'offer', 'hired', 'rejected'
  ) THEN
    RAISE EXCEPTION 'Invalid stage: %', NEW.stage;
  END IF;
  IF NEW.ai_score IS NOT NULL AND (NEW.ai_score < 0 OR NEW.ai_score > 100) THEN
    RAISE EXCEPTION 'ai_score must be between 0 and 100';
  END IF;
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('active', 'hired', 'rejected', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_hr_candidate
  BEFORE INSERT OR UPDATE ON hr_candidates
  FOR EACH ROW EXECUTE FUNCTION validate_hr_candidate();

CREATE TRIGGER update_hr_candidates_updated_at
  BEFORE UPDATE ON hr_candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================
-- Step 5: Create hr_interviews (new structure)
-- ===================================================
CREATE TABLE hr_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES hr_candidates(id) ON DELETE CASCADE,
  job_posting_id UUID REFERENCES hr_job_postings(id),
  
  interview_type TEXT NOT NULL DEFAULT 'technical',
  
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  
  interviewer_ids UUID[] NOT NULL DEFAULT '{}',
  
  location_type TEXT DEFAULT 'video',
  meeting_link TEXT,
  location_address TEXT,
  
  status TEXT DEFAULT 'scheduled',
  
  feedback JSONB,
  overall_rating INTEGER,
  recommendation TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation trigger for interview
CREATE OR REPLACE FUNCTION validate_hr_interview()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interview_type NOT IN ('phone_screening', 'technical', 'behavioral', 'panel', 'onsite') THEN
    RAISE EXCEPTION 'Invalid interview_type: %', NEW.interview_type;
  END IF;
  IF NEW.location_type IS NOT NULL AND NEW.location_type NOT IN ('in_person', 'video', 'phone') THEN
    RAISE EXCEPTION 'Invalid location_type: %', NEW.location_type;
  END IF;
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('scheduled', 'completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.overall_rating IS NOT NULL AND (NEW.overall_rating < 1 OR NEW.overall_rating > 5) THEN
    RAISE EXCEPTION 'overall_rating must be between 1 and 5';
  END IF;
  IF NEW.recommendation IS NOT NULL AND NEW.recommendation NOT IN ('strong_yes', 'yes', 'maybe', 'no', 'strong_no') THEN
    RAISE EXCEPTION 'Invalid recommendation: %', NEW.recommendation;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_hr_interview
  BEFORE INSERT OR UPDATE ON hr_interviews
  FOR EACH ROW EXECUTE FUNCTION validate_hr_interview();

CREATE TRIGGER update_hr_interviews_updated_at
  BEFORE UPDATE ON hr_interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================
-- Step 6: Create hr_candidate_activities
-- ===================================================
CREATE TABLE hr_candidate_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES hr_candidates(id) ON DELETE CASCADE,
  
  activity_type TEXT NOT NULL,
  
  content TEXT,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Validation trigger for activity_type
CREATE OR REPLACE FUNCTION validate_hr_candidate_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type NOT IN (
    'note', 'email_sent', 'email_received', 'stage_changed', 
    'interview_scheduled', 'interview_completed', 'offer_sent'
  ) THEN
    RAISE EXCEPTION 'Invalid activity_type: %', NEW.activity_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_hr_candidate_activity
  BEFORE INSERT OR UPDATE ON hr_candidate_activities
  FOR EACH ROW EXECUTE FUNCTION validate_hr_candidate_activity();

-- ===================================================
-- Step 7: Indexes
-- ===================================================
CREATE INDEX idx_hr_job_postings_workspace ON hr_job_postings(workspace_id);
CREATE INDEX idx_hr_job_postings_status ON hr_job_postings(status);
CREATE INDEX idx_hr_candidates_workspace ON hr_candidates(workspace_id);
CREATE INDEX idx_hr_candidates_job ON hr_candidates(job_posting_id);
CREATE INDEX idx_hr_candidates_email ON hr_candidates(email);
CREATE INDEX idx_hr_candidates_stage ON hr_candidates(stage);
CREATE INDEX idx_hr_interviews_candidate ON hr_interviews(candidate_id);
CREATE INDEX idx_hr_interviews_scheduled ON hr_interviews(scheduled_at);
CREATE INDEX idx_hr_candidate_activities_candidate ON hr_candidate_activities(candidate_id);

-- ===================================================
-- Step 8: RLS Policies
-- ===================================================
ALTER TABLE hr_job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_candidate_activities ENABLE ROW LEVEL SECURITY;

-- Job postings: workspace members can read, active are publicly viewable
CREATE POLICY "Workspace members can view job postings"
  ON hr_job_postings FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage job postings"
  ON hr_job_postings FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update job postings"
  ON hr_job_postings FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete job postings"
  ON hr_job_postings FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Candidates: workspace members
CREATE POLICY "Workspace members can view candidates"
  ON hr_candidates FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert candidates"
  ON hr_candidates FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update candidates"
  ON hr_candidates FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete candidates"
  ON hr_candidates FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Interviews: workspace members
CREATE POLICY "Workspace members can view interviews"
  ON hr_interviews FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert interviews"
  ON hr_interviews FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update interviews"
  ON hr_interviews FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete interviews"
  ON hr_interviews FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Activities: workspace members
CREATE POLICY "Workspace members can view activities"
  ON hr_candidate_activities FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert activities"
  ON hr_candidate_activities FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
