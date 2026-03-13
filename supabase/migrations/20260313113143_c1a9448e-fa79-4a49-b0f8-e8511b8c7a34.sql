ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS about text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS activity_description text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS racius_url text;