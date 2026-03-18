
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pinterest_url TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS pinterest_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS pinterest_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;
