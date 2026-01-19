-- Adicionar campos do Google Places à tabela companies
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS google_reviews_count INTEGER,
  ADD COLUMN IF NOT EXISTS google_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB,
  ADD COLUMN IF NOT EXISTS price_level TEXT,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS business_status TEXT;

-- Criar índice para pesquisa por google_place_id
CREATE INDEX IF NOT EXISTS idx_companies_google_place_id ON public.companies(google_place_id);

-- Comentários para documentação
COMMENT ON COLUMN public.companies.google_place_id IS 'ID único do Google Places para evitar duplicação';
COMMENT ON COLUMN public.companies.google_rating IS 'Avaliação média no Google (1.0 a 5.0)';
COMMENT ON COLUMN public.companies.google_reviews_count IS 'Número total de reviews no Google';
COMMENT ON COLUMN public.companies.opening_hours IS 'Horário de funcionamento em formato JSON';
COMMENT ON COLUMN public.companies.price_level IS 'Nível de preços (PRICE_LEVEL_FREE, INEXPENSIVE, MODERATE, EXPENSIVE, VERY_EXPENSIVE)';
COMMENT ON COLUMN public.companies.latitude IS 'Coordenada GPS latitude';
COMMENT ON COLUMN public.companies.longitude IS 'Coordenada GPS longitude';
COMMENT ON COLUMN public.companies.business_status IS 'Estado do negócio (OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY)';