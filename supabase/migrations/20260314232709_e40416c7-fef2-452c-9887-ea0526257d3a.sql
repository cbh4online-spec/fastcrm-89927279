
-- Add slug column to c2c_sellers
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug (partial, only non-null)
CREATE UNIQUE INDEX IF NOT EXISTS c2c_sellers_slug_unique ON public.c2c_sellers (slug) WHERE slug IS NOT NULL;

-- Populate slugs for existing sellers from display_name
UPDATE public.c2c_sellers
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(display_name, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiioooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
) || '-' || LEFT(id::text, 4)
WHERE slug IS NULL AND display_name IS NOT NULL;
