-- Create sdr_suppressions table
CREATE TABLE public.sdr_suppressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'manual_optout',
  source_enrollment_id UUID REFERENCES public.sdr_enrollments(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Unique constraint: one suppression per email per workspace
CREATE UNIQUE INDEX idx_sdr_suppressions_workspace_email ON public.sdr_suppressions(workspace_id, LOWER(email));

-- Index for lookups
CREATE INDEX idx_sdr_suppressions_email ON public.sdr_suppressions(LOWER(email));

-- Enable RLS
ALTER TABLE public.sdr_suppressions ENABLE ROW LEVEL SECURITY;

-- RLS policies using workspace membership
CREATE POLICY "Members can view workspace suppressions"
ON public.sdr_suppressions
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can create workspace suppressions"
ON public.sdr_suppressions
FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete workspace suppressions"
ON public.sdr_suppressions
FOR DELETE
TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  )
);