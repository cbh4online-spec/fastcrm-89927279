
ALTER TABLE public.products
  ADD COLUMN competitor_price_low numeric,
  ADD COLUMN competitor_source text;

COMMENT ON COLUMN public.products.competitor_price_low IS 'Preço mais baixo encontrado na concorrência';
COMMENT ON COLUMN public.products.competitor_source IS 'Nome/URL do concorrente com o preço mais baixo';
