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
  -- Workspace Ajax: taxonomia fechada, nunca criar categorias automaticamente.
  IF p_workspace_id = '1d208cbe-3285-45d0-8d9e-7d2bd6e9b2d6'::uuid THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.product_categories (workspace_id, name, slug, is_active, store_visible)
  VALUES (p_workspace_id, v_name, regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), true, true)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;