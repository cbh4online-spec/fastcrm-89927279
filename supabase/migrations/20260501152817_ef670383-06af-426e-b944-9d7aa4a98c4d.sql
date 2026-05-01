CREATE OR REPLACE FUNCTION public.get_product_full_content(p_product_id uuid, p_locale text DEFAULT 'pt-PT'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product RECORD;
  v_sections JSONB;
  v_canonical_how_to_use JSONB := '{}'::jsonb;
  v_canonical_specs JSONB := '{}'::jsonb;
BEGIN
  SELECT id, workspace_id, name, sku, base_price, currency, b2b_published, store_published,
         weight, validity_days, recommended_frequency, included_quantity, total_units, unit_name
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

  -- Atributos canónicos derivados de colunas SSoT (sobrescrevem o jsonb se preenchidos)
  IF v_product.recommended_frequency IS NOT NULL AND v_product.recommended_frequency <> '' THEN
    v_canonical_how_to_use := v_canonical_how_to_use || jsonb_build_object('frequencia', v_product.recommended_frequency);
  END IF;
  IF v_product.included_quantity IS NOT NULL THEN
    v_canonical_how_to_use := v_canonical_how_to_use || jsonb_build_object(
      'dose', v_product.included_quantity::text || COALESCE(' ' || v_product.unit_name, '')
    );
  END IF;

  IF v_product.weight IS NOT NULL THEN
    v_canonical_specs := v_canonical_specs || jsonb_build_object('peso', v_product.weight::text || ' kg');
  END IF;
  IF v_product.validity_days IS NOT NULL THEN
    v_canonical_specs := v_canonical_specs || jsonb_build_object('validade', v_product.validity_days::text || ' dias');
  END IF;
  IF v_product.total_units IS NOT NULL THEN
    v_canonical_specs := v_canonical_specs || jsonb_build_object(
      'volume', v_product.total_units::text || COALESCE(' ' || v_product.unit_name, '')
    );
  END IF;

  SELECT jsonb_object_agg(
    section_key,
    jsonb_build_object(
      'body_markdown', body_markdown,
      'attributes',
        CASE section_key
          WHEN 'how_to_use' THEN COALESCE(attributes, '{}'::jsonb) || v_canonical_how_to_use
          WHEN 'specifications' THEN COALESCE(attributes, '{}'::jsonb) || v_canonical_specs
          ELSE COALESCE(attributes, '{}'::jsonb)
        END,
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

  -- Garante que how_to_use e specifications existem mesmo sem secção criada,
  -- desde que haja dados canónicos das colunas SSoT.
  IF v_sections IS NULL THEN v_sections := '{}'::jsonb; END IF;

  IF NOT (v_sections ? 'how_to_use') AND v_canonical_how_to_use <> '{}'::jsonb THEN
    v_sections := v_sections || jsonb_build_object('how_to_use', jsonb_build_object(
      'body_markdown', NULL, 'attributes', v_canonical_how_to_use, 'locale', p_locale, 'updated_at', NULL
    ));
  END IF;

  IF NOT (v_sections ? 'specifications') AND v_canonical_specs <> '{}'::jsonb THEN
    v_sections := v_sections || jsonb_build_object('specifications', jsonb_build_object(
      'body_markdown', NULL, 'attributes', v_canonical_specs, 'locale', p_locale, 'updated_at', NULL
    ));
  END IF;

  RETURN jsonb_build_object(
    'product_id', v_product.id,
    'name', v_product.name,
    'sku', v_product.sku,
    'base_price', v_product.base_price,
    'currency', v_product.currency,
    'sections', v_sections
  );
END;
$function$;