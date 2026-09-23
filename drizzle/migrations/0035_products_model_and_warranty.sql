ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS warranty_months integer,
  ADD COLUMN IF NOT EXISTS warranty_type text;

COMMENT ON COLUMN public.products.model IS 'Modelo comercial do fabricante (ex.: BulletCam 5 HLVF).';
COMMENT ON COLUMN public.products.warranty_months IS 'Duração da garantia em meses (36 por defeito na UE para consumidor final).';
COMMENT ON COLUMN public.products.warranty_type IS 'Tipo de garantia: manufacturer | store | legal.';
