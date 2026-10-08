CREATE OR REPLACE FUNCTION public.get_public_store_category_tree(p_workspace_id uuid)
RETURNS TABLE (id uuid, workspace_id uuid, name text, slug text, description text, parent_id uuid, "position" integer, store_visible boolean, image_url text, color text, icon text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pc.id, pc.workspace_id, pc.name, pc.slug, pc.description, pc.parent_id, pc.position, pc.store_visible, pc.image_url, pc.color, pc.icon
  FROM public.product_categories pc
  WHERE pc.workspace_id = p_workspace_id AND pc.is_active = true
  ORDER BY pc.position NULLS LAST, pc.name;
$$;
REVOKE ALL ON FUNCTION public.get_public_store_category_tree(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_category_tree(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resolve_store_category_id(p_workspace_id uuid, p_category text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_name text := nullif(trim(p_category), '');
  v_id uuid;
BEGIN
  IF p_workspace_id IS NULL OR v_name IS NULL THEN RETURN NULL; END IF;
  SELECT pc.id INTO v_id FROM public.product_categories pc
  WHERE pc.workspace_id = p_workspace_id AND lower(trim(pc.name)) = lower(v_name)
  ORDER BY pc.parent_id NULLS FIRST, pc.created_at ASC LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  -- Taxonomia existente: nunca criar categorias novas automaticamente.
  IF EXISTS (SELECT 1 FROM public.product_categories pc WHERE pc.workspace_id = p_workspace_id) THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.product_categories (workspace_id, name, slug, is_active, store_visible)
  VALUES (p_workspace_id, v_name, regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), true, true)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_product_store_category()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_name text;
BEGIN
  -- Ligação explícita a uma categoria do mesmo workspace prevalece (inclui filhos ocultos).
  IF NEW.store_category_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.store_category_id IS DISTINCT FROM OLD.store_category_id OR NEW.category IS NOT DISTINCT FROM OLD.category) THEN
    SELECT pc.name INTO v_name FROM public.product_categories pc
    WHERE pc.id = NEW.store_category_id AND pc.workspace_id = NEW.workspace_id;
    IF v_name IS NOT NULL THEN
      NEW.category := v_name;
      RETURN NEW;
    END IF;
    NEW.store_category_id := NULL; -- categoria de outro workspace
  END IF;

  IF nullif(trim(COALESCE(NEW.category, '')), '') IS NULL THEN RETURN NEW; END IF;
  v_id := public.resolve_store_category_id(NEW.workspace_id, NEW.category);
  IF v_id IS NOT NULL THEN
    NEW.store_category_id := v_id;
    SELECT pc.name INTO NEW.category FROM public.product_categories pc WHERE pc.id = v_id;
  END IF;
  RETURN NEW;
END;
$$;