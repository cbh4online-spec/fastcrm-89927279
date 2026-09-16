CREATE OR REPLACE FUNCTION public.resolve_store_category_id(p_workspace_id uuid, p_category text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := nullif(trim(p_category), '');
  v_id uuid;
BEGIN
  IF p_workspace_id IS NULL OR v_name IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT pc.id INTO v_id
  FROM public.product_categories pc
  WHERE pc.workspace_id = p_workspace_id
    AND lower(trim(pc.name)) = lower(v_name)
  ORDER BY pc.created_at ASC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.product_categories (workspace_id, name, slug, is_active, store_visible)
  VALUES (
    p_workspace_id,
    v_name,
    regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'),
    true,
    true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_product_store_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF nullif(trim(COALESCE(NEW.category, '')), '') IS NULL THEN
    RETURN NEW;
  END IF;

  v_id := public.resolve_store_category_id(NEW.workspace_id, NEW.category);

  IF v_id IS NOT NULL THEN
    NEW.store_category_id := v_id;
    SELECT pc.name INTO NEW.category
    FROM public.product_categories pc
    WHERE pc.id = v_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_sync_store_category ON public.products;
CREATE TRIGGER products_sync_store_category
BEFORE INSERT OR UPDATE OF category, store_category_id, workspace_id ON public.products
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_product_store_category();

-- Backfill: liga produtos sem categoria atribuida, criando as categorias em falta
DO $backfill$
DECLARE
  r record;
  v_id uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT workspace_id, trim(category) AS category
    FROM public.products
    WHERE nullif(trim(COALESCE(category, '')), '') IS NOT NULL
      AND workspace_id IS NOT NULL
  LOOP
    v_id := public.resolve_store_category_id(r.workspace_id, r.category);
    IF v_id IS NOT NULL THEN
      UPDATE public.products p
      SET store_category_id = v_id,
          category = (SELECT pc.name FROM public.product_categories pc WHERE pc.id = v_id)
      WHERE p.workspace_id = r.workspace_id
        AND lower(trim(p.category)) = lower(r.category)
        AND (p.store_category_id IS DISTINCT FROM v_id);
    END IF;
  END LOOP;
END
$backfill$;
