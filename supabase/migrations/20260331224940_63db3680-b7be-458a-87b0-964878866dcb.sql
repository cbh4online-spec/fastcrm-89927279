
-- B1: Add consent_required to ebooks
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS consent_required BOOLEAN DEFAULT false;

-- B1: Add CTA extras to ebook_ctas
ALTER TABLE public.ebook_ctas ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.ebook_ctas ADD COLUMN IF NOT EXISTS booking_link TEXT;
ALTER TABLE public.ebook_ctas ADD COLUMN IF NOT EXISTS target_route TEXT;
ALTER TABLE public.ebook_ctas ADD COLUMN IF NOT EXISTS form_id TEXT;
ALTER TABLE public.ebook_ctas ADD COLUMN IF NOT EXISTS style_variant TEXT DEFAULT 'default';

-- B1: Add contact_id to ebook_cta_events
ALTER TABLE public.ebook_cta_events ADD COLUMN IF NOT EXISTS contact_id UUID;
