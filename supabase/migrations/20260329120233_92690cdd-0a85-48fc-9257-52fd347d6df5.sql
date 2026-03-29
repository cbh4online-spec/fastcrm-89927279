
ALTER TABLE public.ebooks
  ADD COLUMN IF NOT EXISTS header_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS footer_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_page jsonb DEFAULT '{}';
