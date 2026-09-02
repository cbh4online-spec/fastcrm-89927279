ALTER TABLE public.booking_pages
  ADD COLUMN IF NOT EXISTS share_image_url text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text;

COMMENT ON COLUMN public.booking_pages.share_image_url IS 'Imagem usada nas pre-visualizacoes de partilha (Open Graph) do link publico de marcacao.';
COMMENT ON COLUMN public.booking_pages.seo_title IS 'Titulo alternativo para partilha/SEO; fallback = title.';
COMMENT ON COLUMN public.booking_pages.seo_description IS 'Descricao alternativa para partilha/SEO; fallback = description.';