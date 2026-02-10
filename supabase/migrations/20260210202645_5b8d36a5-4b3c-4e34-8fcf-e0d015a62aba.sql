
-- Sponsor applications table for self-service flow
CREATE TABLE public.sponsor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website_url TEXT,
  logo_url TEXT,
  description TEXT,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('gold', 'silver', 'bronze')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'expired')),
  rejection_reason TEXT,
  stripe_payment_id TEXT,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'eur',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsor_applications ENABLE ROW LEVEL SECURITY;

-- Users can see their own applications
CREATE POLICY "Users can view own sponsor applications"
  ON public.sponsor_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create applications
CREATE POLICY "Users can create sponsor applications"
  ON public.sponsor_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending applications
CREATE POLICY "Users can update own pending applications"
  ON public.sponsor_applications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Workspace members can view all applications (for admin)
CREATE POLICY "Workspace members can view all sponsor applications"
  ON public.sponsor_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = sponsor_applications.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Admins can update any application
CREATE POLICY "Admins can update sponsor applications"
  ON public.sponsor_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = sponsor_applications.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_sponsor_applications_updated_at
  BEFORE UPDATE ON public.sponsor_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
