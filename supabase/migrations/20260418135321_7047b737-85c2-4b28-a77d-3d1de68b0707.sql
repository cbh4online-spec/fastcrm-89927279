ALTER TABLE public.ebooks
  ADD COLUMN IF NOT EXISTS lead_gate_subtitle text,
  ADD COLUMN IF NOT EXISTS lead_gate_benefits text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS lead_gate_cta_label text DEFAULT 'Aceder ao ebook',
  ADD COLUMN IF NOT EXISTS welcome_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_email_subject text,
  ADD COLUMN IF NOT EXISTS welcome_email_body text,
  ADD COLUMN IF NOT EXISTS notify_manager_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_manager_threshold_pct integer NOT NULL DEFAULT 70 CHECK (notify_manager_threshold_pct BETWEEN 1 AND 100);