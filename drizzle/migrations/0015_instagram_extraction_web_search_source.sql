ALTER TABLE public.instagram_extraction_jobs
  DROP CONSTRAINT IF EXISTS instagram_extraction_jobs_source_check;

ALTER TABLE public.instagram_extraction_jobs
  ADD CONSTRAINT instagram_extraction_jobs_source_check
  CHECK (source IN ('followers','following','hashtag','location','list','web_search'));