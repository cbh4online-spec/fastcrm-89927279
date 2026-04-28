ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_net numeric(10,3),
  ADD COLUMN IF NOT EXISTS weight_gross numeric(10,3),
  ADD COLUMN IF NOT EXISTS volume_value numeric(10,3),
  ADD COLUMN IF NOT EXISTS volume_unit text,
  ADD COLUMN IF NOT EXISTS length_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS width_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS height_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS package_type text;

-- Sanity checks (no negative values)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_physical_non_negative') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_physical_non_negative
      CHECK (
        (weight_net   IS NULL OR weight_net   >= 0) AND
        (weight_gross IS NULL OR weight_gross >= 0) AND
        (volume_value IS NULL OR volume_value >= 0) AND
        (length_cm    IS NULL OR length_cm    >= 0) AND
        (width_cm     IS NULL OR width_cm     >= 0) AND
        (height_cm    IS NULL OR height_cm    >= 0)
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_volume_unit_check') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_volume_unit_check
      CHECK (volume_unit IS NULL OR volume_unit IN ('ml','L','g','kg','oz'));
  END IF;
END $$;

COMMENT ON COLUMN public.products.weight_net    IS 'Peso líquido em kg (sem embalagem)';
COMMENT ON COLUMN public.products.weight_gross  IS 'Peso bruto em kg (com embalagem) — usado para portes';
COMMENT ON COLUMN public.products.volume_value  IS 'Capacidade do produto (valor numérico)';
COMMENT ON COLUMN public.products.volume_unit   IS 'Unidade da capacidade: ml, L, g, kg, oz';
COMMENT ON COLUMN public.products.length_cm     IS 'Profundidade/comprimento da embalagem (cm)';
COMMENT ON COLUMN public.products.width_cm      IS 'Largura da embalagem (cm)';
COMMENT ON COLUMN public.products.height_cm     IS 'Altura da embalagem (cm)';
COMMENT ON COLUMN public.products.package_type  IS 'Tipo de embalagem: frasco, bisnaga, ampola, caixa, saqueta, blister, spray, outro';