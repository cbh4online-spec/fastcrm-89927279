ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS indexed_for_copilot_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_products_indexed_for_copilot_at
  ON public.products (workspace_id, indexed_for_copilot_at);

CREATE OR REPLACE FUNCTION public.ensure_b2b_catalog_kb(p_workspace_id uuid, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kb_id uuid;
BEGIN
  SELECT id INTO v_kb_id
  FROM public.knowledge_bases
  WHERE workspace_id = p_workspace_id
    AND type = 'b2b_catalog'
  LIMIT 1;

  IF v_kb_id IS NULL THEN
    INSERT INTO public.knowledge_bases (workspace_id, name, description, type, is_active, created_by)
    VALUES (
      p_workspace_id,
      'Catálogo B2B (Copilot)',
      'Indexação automática do catálogo para o Copilot B2B. Não editar manualmente.',
      'b2b_catalog',
      true,
      p_user_id
    )
    RETURNING id INTO v_kb_id;
  END IF;

  RETURN v_kb_id;
END;
$$;