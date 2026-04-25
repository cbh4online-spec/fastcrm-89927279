ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS page_type TEXT NOT NULL DEFAULT 'builder',
  ADD COLUMN IF NOT EXISTS custom_html TEXT,
  ADD COLUMN IF NOT EXISTS custom_html_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_page_type_check'
  ) THEN
    ALTER TABLE public.landing_pages
      ADD CONSTRAINT landing_pages_page_type_check
      CHECK (page_type IN ('builder', 'custom_html'));
  END IF;
END $$;