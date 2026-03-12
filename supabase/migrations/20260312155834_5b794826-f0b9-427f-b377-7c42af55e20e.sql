
CREATE TABLE public.funnel_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE NOT NULL,
  step_id UUID REFERENCES public.funnel_steps(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}',
  source_url TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_submissions ENABLE ROW LEVEL SECURITY;

-- Public can insert (form submissions from anonymous visitors)
CREATE POLICY "Anyone can submit funnel forms"
ON public.funnel_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only authenticated users who own the funnel can read submissions
CREATE POLICY "Funnel owners can read submissions"
ON public.funnel_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.funnels f
    WHERE f.id = funnel_submissions.funnel_id
    AND f.workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
);
