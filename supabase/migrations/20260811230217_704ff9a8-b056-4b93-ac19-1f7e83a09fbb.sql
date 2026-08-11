ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_slug text;

CREATE OR REPLACE FUNCTION public.unaccent_safe(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate(
    coalesce(_txt, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  )
$$;

CREATE OR REPLACE FUNCTION public.slugify_text(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(public.unaccent_safe(coalesce(_txt, ''))),
    '[^a-z0-9]+', '-', 'g'
  ))
$$;

WITH base AS (
  SELECT id, workspace_id, NULLIF(public.slugify_text(name), '') AS s
  FROM public.products
  WHERE store_slug IS NULL
),
numbered AS (
  SELECT id, workspace_id, s,
         ROW_NUMBER() OVER (PARTITION BY workspace_id, s ORDER BY id) AS rn
  FROM base
)
UPDATE public.products p
SET store_slug = CASE WHEN n.rn = 1 THEN COALESCE(n.s, left(p.id::text, 8))
                      ELSE COALESCE(n.s, left(p.id::text, 8)) || '-' || n.rn::text END
FROM numbered n
WHERE p.id = n.id;

CREATE UNIQUE INDEX IF NOT EXISTS products_workspace_store_slug_key
  ON public.products (workspace_id, store_slug)
  WHERE store_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.products_set_store_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  i int := 1;
BEGIN
  IF NEW.store_slug IS NULL OR btrim(NEW.store_slug) = '' THEN
    base_slug := NULLIF(public.slugify_text(NEW.name), '');
    IF base_slug IS NULL THEN
      base_slug := left(NEW.id::text, 8);
    END IF;
  ELSE
    base_slug := public.slugify_text(NEW.store_slug);
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := left(NEW.id::text, 8);
    END IF;
  END IF;

  candidate := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.products
    WHERE workspace_id = NEW.workspace_id
      AND store_slug = candidate
      AND id <> NEW.id
  ) LOOP
    i := i + 1;
    candidate := base_slug || '-' || i::text;
  END LOOP;

  NEW.store_slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_set_store_slug ON public.products;
CREATE TRIGGER trg_products_set_store_slug
  BEFORE INSERT OR UPDATE OF name, store_slug ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_set_store_slug();