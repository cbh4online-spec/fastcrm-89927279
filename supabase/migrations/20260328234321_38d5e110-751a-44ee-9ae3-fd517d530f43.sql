ALTER TABLE public.ebooks 
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'modern-dark',
  ADD COLUMN IF NOT EXISTS image_style text DEFAULT 'illustration',
  ADD COLUMN IF NOT EXISTS image_keywords text[] DEFAULT '{}'::text[];