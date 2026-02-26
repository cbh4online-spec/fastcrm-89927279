ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS birth_date DATE;