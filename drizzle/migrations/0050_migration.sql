ALTER TABLE public.instagram_extraction_jobs
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS listing_note text;
COMMENT ON COLUMN public.instagram_extraction_jobs.provider IS 'Fornecedor real da listagem (ex.: profilequery). Nulo em trabalhos antigos.';
COMMENT ON COLUMN public.instagram_extraction_jobs.listing_note IS 'Nota informativa (não erro), ex.: lista terminou antes do máximo.';