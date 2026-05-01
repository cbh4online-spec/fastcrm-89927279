-- ==========================================================================
-- RPCs para Copilot B2B: get_product_for_copilot + search_b2b_catalog
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.copilot_can_access_workspace(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = _workspace_id
        AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.client_users
      WHERE workspace_id = _workspace_id
        AND auth_user_id = auth.uid()
        AND COALESCE(status, 'active') = 'active'
    );
$$;

COMMENT ON FUNCTION public.copilot_can_access_workspace(uuid) IS
  'Autorização Copilot B2B: membro do workspace, client_user activo ou super_admin.';

-- ==========================================================================
-- 1) get_product_for_copilot
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.get_product_for_copilot(
  p_workspace_id uuid,
  p_product_id uuid,
  p_locale text DEFAULT 'pt-PT'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product record;
  v_sections jsonb;
  v_attributes jsonb;
BEGIN
  IF NOT public.copilot_can_access_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT
    p.id, p.workspace_id, p.name, p.sku, p.category, p.short_description,
    p.base_price, p.currency, p.billing_type, p.billing_frequency,
    p.recurring_fee, p.setup_fee,
    p.unit_name, p.included_quantity, p.total_units,
    p.recommended_frequency, p.validity_days, p.typical_duration_days,
    p.delivery_mode, p.delivery_estimate,
    p.stock_status, p.min_order_quantity, p.order_multiple, p.pack_size,
    p.images, p.primary_image_index, p.search_keywords,
    p.benefits, p.business_types,
    p.b2b_published, p.indexed_for_copilot_at, p.updated_at
  INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id
    AND p.workspace_id = p_workspace_id
    AND COALESCE(p.b2b_published, false) = true
    AND p.status = 'active';

  IF v_product.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_object_agg(
    s.section_key,
    jsonb_build_object(
      'body_markdown', s.body_markdown,
      'attributes', s.attributes,
      'is_published', s.is_published,
      'updated_at', s.updated_at
    )
  )
  INTO v_sections
  FROM public.product_content_sections s
  WHERE s.product_id = p_product_id
    AND s.workspace_id = p_workspace_id
    AND s.locale = p_locale
    AND COALESCE(s.is_published, true) = true;

  SELECT jsonb_object_agg(attr_type, values)
  INTO v_attributes
  FROM (
    SELECT
      a.attribute_type AS attr_type,
      jsonb_agg(a.attribute_value ORDER BY a.display_order, a.attribute_value) AS values
    FROM public.product_attributes a
    WHERE a.product_id = p_product_id
      AND a.workspace_id = p_workspace_id
    GROUP BY a.attribute_type
  ) g;

  RETURN jsonb_build_object(
    'product', to_jsonb(v_product),
    'sections', COALESCE(v_sections, '{}'::jsonb),
    'attributes', COALESCE(v_attributes, '{}'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.get_product_for_copilot(uuid, uuid, text) IS
  'Documento completo de um produto B2B-published para o Copilot.';

-- ==========================================================================
-- 2) search_b2b_catalog
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.search_b2b_catalog(
  p_workspace_id uuid,
  p_query text,
  p_limit integer DEFAULT 10,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  product_id uuid,
  name text,
  sku text,
  category text,
  short_description text,
  base_price numeric,
  currency text,
  primary_image text,
  rank real,
  matched_section text,
  snippet text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tsquery tsquery;
BEGIN
  IF NOT public.copilot_can_access_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_query IS NULL OR length(trim(p_query)) = 0 THEN
    RETURN;
  END IF;

  v_tsquery := websearch_to_tsquery('portuguese', p_query);

  RETURN QUERY
  WITH product_matches AS (
    SELECT
      p.id AS product_id,
      p.name,
      p.sku,
      p.category,
      p.short_description,
      p.base_price,
      p.currency,
      CASE
        WHEN p.images IS NOT NULL AND array_length(p.images, 1) > 0
        THEN p.images[GREATEST(COALESCE(p.primary_image_index, 0), 0) + 1]
        ELSE NULL
      END AS primary_image,
      ts_rank(
        setweight(to_tsvector('portuguese', coalesce(p.name, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(p.sku, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(p.category, '')), 'B') ||
        setweight(to_tsvector('portuguese', coalesce(p.short_description, '')), 'C') ||
        setweight(to_tsvector('portuguese', coalesce(p.search_keywords, '')), 'C'),
        v_tsquery
      ) AS rank,
      'product'::text AS matched_section,
      coalesce(p.short_description, p.name) AS snippet
    FROM public.products p
    WHERE p.workspace_id = p_workspace_id
      AND COALESCE(p.b2b_published, false) = true
      AND p.status = 'active'
      AND (p_category IS NULL OR p.category = p_category)
      AND to_tsvector('portuguese',
        coalesce(p.name, '') || ' ' ||
        coalesce(p.sku, '') || ' ' ||
        coalesce(p.category, '') || ' ' ||
        coalesce(p.short_description, '') || ' ' ||
        coalesce(p.search_keywords, '')
      ) @@ v_tsquery
  ),
  section_matches AS (
    SELECT
      p.id AS product_id,
      p.name,
      p.sku,
      p.category,
      p.short_description,
      p.base_price,
      p.currency,
      CASE
        WHEN p.images IS NOT NULL AND array_length(p.images, 1) > 0
        THEN p.images[GREATEST(COALESCE(p.primary_image_index, 0), 0) + 1]
        ELSE NULL
      END AS primary_image,
      ts_rank(to_tsvector('portuguese', coalesce(s.body_markdown, '')), v_tsquery) * 0.7 AS rank,
      s.section_key::text AS matched_section,
      ts_headline(
        'portuguese',
        coalesce(s.body_markdown, ''),
        v_tsquery,
        'MaxWords=30, MinWords=10, ShortWord=3, MaxFragments=1'
      ) AS snippet
    FROM public.product_content_sections s
    JOIN public.products p ON p.id = s.product_id
    WHERE s.workspace_id = p_workspace_id
      AND p.workspace_id = p_workspace_id
      AND COALESCE(p.b2b_published, false) = true
      AND p.status = 'active'
      AND COALESCE(s.is_published, true) = true
      AND (p_category IS NULL OR p.category = p_category)
      AND s.body_markdown IS NOT NULL
      AND to_tsvector('portuguese', s.body_markdown) @@ v_tsquery
  ),
  combined AS (
    SELECT * FROM product_matches
    UNION ALL
    SELECT * FROM section_matches
  ),
  ranked AS (
    SELECT DISTINCT ON (product_id)
      product_id, name, sku, category, short_description,
      base_price, currency, primary_image, rank, matched_section, snippet
    FROM combined
    ORDER BY product_id, rank DESC
  )
  SELECT *
  FROM ranked
  ORDER BY rank DESC
  LIMIT GREATEST(LEAST(COALESCE(p_limit, 10), 50), 1);
END;
$$;

COMMENT ON FUNCTION public.search_b2b_catalog(uuid, text, integer, text) IS
  'Pesquisa full-text no catálogo B2B (produtos + secções), restrita ao workspace.';

REVOKE ALL ON FUNCTION public.copilot_can_access_workspace(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_product_for_copilot(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_b2b_catalog(uuid, text, integer, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.copilot_can_access_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_for_copilot(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_b2b_catalog(uuid, text, integer, text) TO authenticated;