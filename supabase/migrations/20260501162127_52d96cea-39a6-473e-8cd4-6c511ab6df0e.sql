DROP VIEW IF EXISTS public.partner_b2b_catalog_grouped;

CREATE VIEW public.partner_b2b_catalog_grouped
WITH (security_invoker = true)
AS
WITH category_mode AS (
  SELECT
    p.id AS product_id,
    COALESCE(pc.variant_display_mode, 'grouped'::text) AS display_mode
  FROM public.products p
  LEFT JOIN public.product_categories pc
    ON pc.workspace_id = p.workspace_id
   AND pc.name = p.category
)
SELECT
  p.*,
  cm.display_mode AS variant_display_mode,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pv.id,
          'sku', pv.sku,
          'variant_label', pv.name,
          'variant_attributes', pv.attributes,
          'base_price', COALESCE(pv.price_override, p.base_price),
          'stock_status',
            CASE
              WHEN pv.track_stock = false THEN p.stock_status::text
              WHEN pv.stock_quantity > 0 THEN 'available'
              ELSE 'out_of_stock'
            END,
          'stock_quantity', pv.stock_quantity,
          'min_order_quantity', p.min_order_quantity,
          'pack_size', p.pack_size,
          'images', p.images
        )
        ORDER BY pv.sort_order, pv.name, pv.sku
      )
      FROM public.product_variants pv
      WHERE pv.product_id = p.id
        AND pv.is_active = true
    ),
    '[]'::jsonb
  ) AS variants
FROM public.products p
JOIN category_mode cm ON cm.product_id = p.id
WHERE p.b2b_published = true
  AND p.status = 'active'
  AND p.parent_product_id IS NULL;

COMMENT ON VIEW public.partner_b2b_catalog_grouped IS
'Catálogo B2B agrupado por produto pai. Variantes lidas de product_variants (SSoT). O modelo legado products.parent_product_id está deprecado e é excluído da view.';