
ALTER TABLE public.ebook_notes
  ADD COLUMN IF NOT EXISTS highlight_text text,
  ADD COLUMN IF NOT EXISTS highlight_color text DEFAULT '#fde68a',
  ADD COLUMN IF NOT EXISTS highlight_range jsonb;
