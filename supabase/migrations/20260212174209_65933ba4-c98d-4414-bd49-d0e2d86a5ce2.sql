-- Expand fastclub_applications with all new fields
ALTER TABLE public.fastclub_applications 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS employees_count INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_annual_revenue TEXT,
  ADD COLUMN IF NOT EXISTS strategic_objective TEXT,
  ADD COLUMN IF NOT EXISTS contribution TEXT,
  ADD COLUMN IF NOT EXISTS candidate_tier TEXT,
  ADD COLUMN IF NOT EXISTS profile_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS contact_id UUID,
  ADD COLUMN IF NOT EXISTS opportunity_id UUID,
  ADD COLUMN IF NOT EXISTS workspace_id UUID,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Make email required for new flow
ALTER TABLE public.fastclub_applications ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.fastclub_applications ALTER COLUMN email SET DEFAULT '';

-- Rename 'role' to avoid confusion (it maps to job_title now)
-- We keep existing columns for backward compat

-- Add index for lookup performance
CREATE INDEX IF NOT EXISTS idx_fastclub_applications_email ON public.fastclub_applications(email);
CREATE INDEX IF NOT EXISTS idx_fastclub_applications_status ON public.fastclub_applications(status);
CREATE INDEX IF NOT EXISTS idx_fastclub_applications_candidate_tier ON public.fastclub_applications(candidate_tier);
CREATE INDEX IF NOT EXISTS idx_fastclub_applications_workspace_id ON public.fastclub_applications(workspace_id);

-- Allow authenticated users to update (for admin status changes)
CREATE POLICY "Allow authenticated update" ON public.fastclub_applications
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);