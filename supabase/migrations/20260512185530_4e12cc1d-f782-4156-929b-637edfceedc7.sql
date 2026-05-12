CREATE TABLE IF NOT EXISTS public.pt_postal_code_cache (
  postal_code TEXT PRIMARY KEY,
  address TEXT,
  city TEXT,
  municipality TEXT,
  district TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pt_postal_code_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "postal cache readable by authenticated"
ON public.pt_postal_code_cache
FOR SELECT
TO authenticated
USING (true);