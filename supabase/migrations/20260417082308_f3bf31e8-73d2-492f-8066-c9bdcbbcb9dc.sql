-- Lead gate configuration on ebooks
ALTER TABLE public.ebooks
  ADD COLUMN IF NOT EXISTS lead_gate_trigger TEXT NOT NULL DEFAULT 'never',
  ADD COLUMN IF NOT EXISTS lead_gate_after_pages INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS lead_gate_require_name BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lead_gate_require_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lead_gate_require_phone BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_gate_title TEXT,
  ADD COLUMN IF NOT EXISTS lead_gate_description TEXT,
  ADD COLUMN IF NOT EXISTS lead_gate_cta_label TEXT;

-- Validation: trigger value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ebooks_lead_gate_trigger_check'
  ) THEN
    ALTER TABLE public.ebooks
      ADD CONSTRAINT ebooks_lead_gate_trigger_check
      CHECK (lead_gate_trigger IN ('never','always','after_pages'));
  END IF;
END $$;

-- ebook_views: add captured lead/contact identifiers and reader phone
ALTER TABLE public.ebook_views
  ADD COLUMN IF NOT EXISTS lead_id UUID,
  ADD COLUMN IF NOT EXISTS reader_phone TEXT,
  ADD COLUMN IF NOT EXISTS lead_captured_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ebook_views_lead_id ON public.ebook_views(lead_id);
CREATE INDEX IF NOT EXISTS idx_ebook_views_contact_id ON public.ebook_views(contact_id);
CREATE INDEX IF NOT EXISTS idx_ebook_views_reader_email ON public.ebook_views(reader_email);
