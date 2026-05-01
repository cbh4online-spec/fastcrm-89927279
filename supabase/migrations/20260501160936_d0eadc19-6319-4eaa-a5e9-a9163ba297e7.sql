-- View: product_b2b_content
-- Agrega dados B2B por produto: products + product_content +
-- product_content_sections (overview/how_to_use/specifications/clinical) +
-- product_spec_attributes + product_attributes (clinical/technical indexers).
-- Calcula content_completeness (0-100) e flags por bloco.
--
-- security_invoker=true => respeita as políticas RLS das tabelas-base
-- (workspace_members), evitando bypass de isolamento.

CREATE OR REPLACE VIEW public.product_b2b_content
WITH (security_invoker = true) AS
WITH sections AS (
  SELECT
    pcs.product_id,
    jsonb_object_agg(
      pcs.section_key,
      jsonb_build_object(
        'body_markdown', pcs.body_markdown,
        'attributes', pcs.attributes,
        'is_published', pcs.is_published,
        'source', pcs.source,
        'updated_at', pcs.updated_at
      )
    ) FILTER (WHERE pcs.locale = 'pt-PT') AS sections_map,
    bool_or(pcs.section_key = 'overview'       AND pcs.is_published AND COALESCE(length(btrim(pcs.body_markdown)),0) > 0) AS has_overview,
    bool_or(pcs.section_key = 'how_to_use'     AND pcs.is_published AND (COALESCE(length(btrim(pcs.body_markdown)),0) > 0 OR pcs.attributes <> '{}'::jsonb)) AS has_how_to_use,
    bool_or(pcs.section_key = 'specifications' AND pcs.is_published AND (COALESCE(length(btrim(pcs.body_markdown)),0) > 0 OR pcs.attributes <> '{}'::jsonb)) AS has_specifications_section,
    bool_or(pcs.section_key = 'clinical'       AND pcs.is_published AND (COALESCE(length(btrim(pcs.body_markdown)),0) > 0 OR pcs.attributes <> '{}'::jsonb)) AS has_clinical
  FROM public.product_content_sections pcs
  WHERE pcs.locale = 'pt-PT'
  GROUP BY pcs.product_id
),
specs AS (
  SELECT
    psa.product_id,
    jsonb_agg(
      jsonb_build_object(
        'spec_key', psa.spec_key,
        'spec_value', psa.spec_value,
        'unit', psa.unit,
        'spec_group', psa.spec_group,
        'display_order', psa.display_order
      )
      ORDER BY psa.spec_group NULLS LAST, psa.display_order, psa.spec_key
    ) AS spec_attributes,
    count(*)::int AS spec_attributes_count
  FROM public.product_spec_attributes psa
  GROUP BY psa.product_id
),
attrs AS (
  SELECT
    pa.product_id,
    jsonb_object_agg(at_type, at_values) AS attributes_grouped,
    sum(at_count)::int AS attributes_count
  FROM (
    SELECT
      pa.product_id,
      pa.attribute_type::text AS at_type,
      jsonb_agg(pa.attribute_value ORDER BY pa.display_order, pa.attribute_value) AS at_values,
      count(*) AS at_count
    FROM public.product_attributes pa
    GROUP BY pa.product_id, pa.attribute_type
  ) pa
  GROUP BY pa.product_id
)
SELECT
  p.id AS product_id,
  p.workspace_id,
  p.name,
  p.sku,
  p.category,
  p.status,
  p.b2b_published,
  p.short_description,
  p.recommended_frequency,
  p.included_quantity,
  p.unit_name,
  p.weight,
  p.validity_days,
  p.total_units,
  p.indexed_for_copilot_at,

  -- product_content (1:1)
  pc.short_title,
  pc.seo_title,
  pc.long_description,
  pc.benefits,
  pc.usage_instructions,
  pc.precautions,
  pc.meta_description,
  pc.seo_keywords,
  pc.catalog_text,
  pc.proposal_text,
  pc.tags,
  pc.reviewed AS content_reviewed,
  pc.updated_at AS content_updated_at,

  -- Secções (mapa por section_key)
  COALESCE(s.sections_map, '{}'::jsonb) AS sections,

  -- Spec attributes (lista) + grouped indexers
  COALESCE(sp.spec_attributes, '[]'::jsonb) AS spec_attributes,
  COALESCE(sp.spec_attributes_count, 0)     AS spec_attributes_count,
  COALESCE(a.attributes_grouped, '{}'::jsonb) AS clinical_attributes,
  COALESCE(a.attributes_count, 0)             AS clinical_attributes_count,

  -- Flags de presença (booleans)
  (COALESCE(length(btrim(p.short_description)), 0) > 0
    OR COALESCE(length(btrim(pc.short_description)), 0) > 0) AS has_short_description,
  (COALESCE(length(btrim(pc.long_description)), 0) > 0)      AS has_long_description,
  (jsonb_typeof(pc.benefits) = 'array' AND jsonb_array_length(pc.benefits) > 0) AS has_benefits,
  (COALESCE(length(btrim(pc.meta_description)), 0) > 0)      AS has_seo_meta,
  COALESCE(s.has_overview, false)                            AS has_overview,
  COALESCE(s.has_how_to_use, false)                          AS has_how_to_use,
  COALESCE(s.has_specifications_section, false)              AS has_specifications_section,
  COALESCE(s.has_clinical, false)                            AS has_clinical,
  (COALESCE(sp.spec_attributes_count, 0) > 0)                AS has_spec_attributes,
  (COALESCE(a.attributes_count, 0) > 0)                      AS has_clinical_attributes,
  (p.indexed_for_copilot_at IS NOT NULL
    AND (pc.updated_at IS NULL OR p.indexed_for_copilot_at >= pc.updated_at)) AS is_indexed_fresh,

  -- content_completeness (0-100): 10 sinais, 10 pontos cada
  (
    (CASE WHEN COALESCE(length(btrim(p.short_description)),0) > 0
            OR COALESCE(length(btrim(pc.short_description)),0) > 0 THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(length(btrim(pc.long_description)),0) > 0 THEN 10 ELSE 0 END) +
    (CASE WHEN jsonb_typeof(pc.benefits) = 'array' AND jsonb_array_length(pc.benefits) > 0 THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(length(btrim(pc.meta_description)),0) > 0 THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(s.has_overview, false)                  THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(s.has_how_to_use, false)                THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(s.has_specifications_section, false)    THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(s.has_clinical, false)                  THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(sp.spec_attributes_count, 0) > 0        THEN 10 ELSE 0 END) +
    (CASE WHEN COALESCE(a.attributes_count, 0) > 0              THEN 10 ELSE 0 END)
  )::int AS content_completeness

FROM public.products p
LEFT JOIN public.product_content pc ON pc.product_id = p.id
LEFT JOIN sections s                 ON s.product_id  = p.id
LEFT JOIN specs    sp                ON sp.product_id = p.id
LEFT JOIN attrs    a                 ON a.product_id  = p.id;

COMMENT ON VIEW public.product_b2b_content IS
  'Vista agregada por produto para Copilot/Catálogo B2B. Junta products, product_content, product_content_sections, product_spec_attributes e product_attributes; expõe flags de presença e content_completeness (0-100). security_invoker=true: respeita RLS das tabelas-base (workspace_members).';

GRANT SELECT ON public.product_b2b_content TO authenticated;