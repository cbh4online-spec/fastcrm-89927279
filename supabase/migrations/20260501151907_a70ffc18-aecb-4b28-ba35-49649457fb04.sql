
-- =========================================
-- PRODUCT CONTENT SECTIONS (estruturado por secção)
-- =========================================
CREATE TABLE public.product_content_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL CHECK (section_key IN ('overview','how_to_use','specifications','clinical')),
  locale TEXT NOT NULL DEFAULT 'pt-PT',
  body_markdown TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','migration','ai_autofill','import')),
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, section_key, locale)
);

CREATE INDEX idx_pcs_product ON public.product_content_sections(product_id, section_key) WHERE is_published;
CREATE INDEX idx_pcs_workspace ON public.product_content_sections(workspace_id);
CREATE INDEX idx_pcs_attributes_gin ON public.product_content_sections USING GIN (attributes);

-- RLS
ALTER TABLE public.product_content_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY pcs_ws_member ON public.product_content_sections
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER trg_pcs_updated_at
  BEFORE UPDATE ON public.product_content_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- MIGRAÇÃO AUTOMÁTICA: dados existentes -> nova estrutura
-- =========================================
-- overview <- commercial_description (fallback short_description)
INSERT INTO public.product_content_sections (workspace_id, product_id, section_key, body_markdown, source)
SELECT
  p.workspace_id,
  p.id,
  'overview',
  COALESCE(NULLIF(p.commercial_description, ''), NULLIF(p.short_description, '')),
  'migration'
FROM public.products p
WHERE COALESCE(NULLIF(p.commercial_description, ''), NULLIF(p.short_description, '')) IS NOT NULL
ON CONFLICT (product_id, section_key, locale) DO NOTHING;

-- specifications <- jsonb existente (passa para attributes)
INSERT INTO public.product_content_sections (workspace_id, product_id, section_key, attributes, source)
SELECT
  p.workspace_id,
  p.id,
  'specifications',
  p.specifications,
  'migration'
FROM public.products p
WHERE p.specifications IS NOT NULL
  AND jsonb_typeof(p.specifications) = 'object'
  AND p.specifications <> '{}'::jsonb
ON CONFLICT (product_id, section_key, locale) DO NOTHING;

-- clinical <- conditions (texto de contraindicações/condições)
INSERT INTO public.product_content_sections (workspace_id, product_id, section_key, body_markdown, source)
SELECT
  p.workspace_id,
  p.id,
  'clinical',
  p.conditions,
  'migration'
FROM public.products p
WHERE NULLIF(p.conditions, '') IS NOT NULL
ON CONFLICT (product_id, section_key, locale) DO NOTHING;

-- =========================================
-- RPCs PARA O COPILOT B2B
-- =========================================

-- 1. get_product_section: lê uma secção específica de um produto
CREATE OR REPLACE FUNCTION public.get_product_section(
  p_product_id UUID,
  p_section_key TEXT,
  p_locale TEXT DEFAULT 'pt-PT'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_result JSONB;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM public.products WHERE id = p_product_id;
  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('error', 'product_not_found');
  END IF;

  -- Permissões: membro do workspace OU produto publicado em B2B/loja
  IF NOT (
    is_workspace_member(auth.uid(), v_workspace_id)
    OR is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND (b2b_published OR store_published))
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT jsonb_build_object(
    'section_key', section_key,
    'locale', locale,
    'body_markdown', body_markdown,
    'attributes', attributes,
    'updated_at', updated_at
  ) INTO v_result
  FROM public.product_content_sections
  WHERE product_id = p_product_id
    AND section_key = p_section_key
    AND locale = p_locale
    AND is_published
  LIMIT 1;

  -- Fallback para pt-PT se locale pedido não existir
  IF v_result IS NULL AND p_locale <> 'pt-PT' THEN
    SELECT jsonb_build_object(
      'section_key', section_key,
      'locale', locale,
      'body_markdown', body_markdown,
      'attributes', attributes,
      'updated_at', updated_at
    ) INTO v_result
    FROM public.product_content_sections
    WHERE product_id = p_product_id
      AND section_key = p_section_key
      AND locale = 'pt-PT'
      AND is_published
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_result, jsonb_build_object('section_key', p_section_key, 'body_markdown', null, 'attributes', '{}'::jsonb));
END;
$$;

-- 2. get_product_full_content: devolve produto + todas as secções (para Copilot ter contexto completo)
CREATE OR REPLACE FUNCTION public.get_product_full_content(
  p_product_id UUID,
  p_locale TEXT DEFAULT 'pt-PT'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_sections JSONB;
BEGIN
  SELECT id, workspace_id, name, sku, base_price, currency, b2b_published, store_published
  INTO v_product
  FROM public.products
  WHERE id = p_product_id;

  IF v_product.id IS NULL THEN
    RETURN jsonb_build_object('error', 'product_not_found');
  END IF;

  IF NOT (
    is_workspace_member(auth.uid(), v_product.workspace_id)
    OR is_super_admin(auth.uid())
    OR v_product.b2b_published
    OR v_product.store_published
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT jsonb_object_agg(
    section_key,
    jsonb_build_object(
      'body_markdown', body_markdown,
      'attributes', attributes,
      'locale', locale,
      'updated_at', updated_at
    )
  ) INTO v_sections
  FROM (
    SELECT DISTINCT ON (section_key)
      section_key, body_markdown, attributes, locale, updated_at
    FROM public.product_content_sections
    WHERE product_id = p_product_id
      AND is_published
      AND locale IN (p_locale, 'pt-PT')
    ORDER BY section_key, (locale = p_locale) DESC, updated_at DESC
  ) s;

  RETURN jsonb_build_object(
    'product_id', v_product.id,
    'name', v_product.name,
    'sku', v_product.sku,
    'base_price', v_product.base_price,
    'currency', v_product.currency,
    'sections', COALESCE(v_sections, '{}'::jsonb)
  );
END;
$$;

-- 3. search_product_sections: pesquisa cross-produtos por secção e termo (RAG-friendly)
CREATE OR REPLACE FUNCTION public.search_product_sections(
  p_workspace_id UUID,
  p_query TEXT,
  p_section_key TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  sku TEXT,
  section_key TEXT,
  snippet TEXT,
  attributes JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_workspace_member(auth.uid(), p_workspace_id) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    s.section_key,
    LEFT(COALESCE(s.body_markdown, s.attributes::text), 400) AS snippet,
    s.attributes
  FROM public.product_content_sections s
  JOIN public.products p ON p.id = s.product_id
  WHERE s.workspace_id = p_workspace_id
    AND s.is_published
    AND (p_section_key IS NULL OR s.section_key = p_section_key)
    AND (
      s.body_markdown ILIKE '%' || p_query || '%'
      OR s.attributes::text ILIKE '%' || p_query || '%'
      OR p.name ILIKE '%' || p_query || '%'
    )
  ORDER BY
    (p.name ILIKE '%' || p_query || '%') DESC,
    s.updated_at DESC
  LIMIT p_limit;
END;
$$;

-- 4. upsert_product_section: gravar/actualizar uma secção
CREATE OR REPLACE FUNCTION public.upsert_product_section(
  p_product_id UUID,
  p_section_key TEXT,
  p_body_markdown TEXT DEFAULT NULL,
  p_attributes JSONB DEFAULT '{}'::jsonb,
  p_locale TEXT DEFAULT 'pt-PT'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_id UUID;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM public.products WHERE id = p_product_id;
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF NOT (is_workspace_member(auth.uid(), v_workspace_id) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_section_key NOT IN ('overview','how_to_use','specifications','clinical') THEN
    RAISE EXCEPTION 'invalid_section_key';
  END IF;

  INSERT INTO public.product_content_sections (
    workspace_id, product_id, section_key, locale, body_markdown, attributes, source, updated_by
  ) VALUES (
    v_workspace_id, p_product_id, p_section_key, p_locale, p_body_markdown, COALESCE(p_attributes, '{}'::jsonb), 'manual', auth.uid()
  )
  ON CONFLICT (product_id, section_key, locale) DO UPDATE SET
    body_markdown = EXCLUDED.body_markdown,
    attributes = EXCLUDED.attributes,
    updated_by = auth.uid(),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_section TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_product_full_content TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_product_sections TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_product_section TO authenticated;
