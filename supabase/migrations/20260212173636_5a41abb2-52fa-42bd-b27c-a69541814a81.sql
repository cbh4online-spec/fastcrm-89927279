CREATE TABLE public.fastclub_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  sector TEXT NOT NULL,
  employees TEXT,
  revenue TEXT,
  website_linkedin TEXT,
  motivation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fastclub_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.fastclub_applications
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow authenticated read" ON public.fastclub_applications
  FOR SELECT TO authenticated USING (true);