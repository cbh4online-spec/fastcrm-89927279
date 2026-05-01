-- =========================================================================
-- Variantes de produto: Pai + filhos via parent_product_id
-- Eixo genérico via variant_attributes (JSONB)
-- Agrupamento na loja B2B configurável por categoria (variant_display_mode)
-- =========================================================================

-- 1. Colunas em products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS parent_product_id uuid
    REFERENCES public.products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS variant_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS variant_label text;

COMMENT ON COLUMN public.products.parent_product_id IS
  'Quando preenchido, este produto é uma variante do produto pai indicado. Pais não podem ter pais (sem encadeamento).';
COMMENT ON COLUMN public.products.variant_attributes IS
  'Atributos genéricos que distinguem esta variante do pai. Exemplo: {"cor":"azul","tamanho":"M","volume":"50ml"}.';
COMMENT ON COLUMN public.products.variant_label IS
  'Rótulo curto da variante para UI (ex.: "Azul / M"). Calculado pelo backoffice ou derivado de variant_attributes.';

-- Índice parcial: só queremos pesquisar variantes (filhos) por pai
CREATE INDEX IF NOT EXISTS idx_products_parent_product_id
  ON public.products(parent_product_id)
  WHERE parent_product_id IS NOT NULL;

-- 2. Trigger de validação:
--    - Sem auto-referência
--    - Sem encadeamento (pai não pode ser variante)
--    - Variante deve estar no mesmo workspace do pai
CREATE OR REPLACE FUNCTION public.validate_product_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_workspace uuid;
  parent_has_parent uuid;
BEGIN
  IF NEW.parent_product_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_product_id = NEW.id THEN
    RAISE EXCEPTION 'Um produto não pode ser variante de si próprio';
  END IF;

  SELECT workspace_id, parent_product_id
    INTO parent_workspace, parent_has_parent
  FROM public.products
  WHERE id = NEW.parent_product_id;

  IF parent_workspace IS NULL THEN
    RAISE EXCEPTION 'Produto-pai não encontrado';
  END IF;

  IF parent_workspace <> NEW.workspace_id THEN
    RAISE EXCEPTION 'A variante tem de pertencer ao mesmo workspace do produto-pai';
  END IF;

  IF parent_has_parent IS NOT NULL THEN
    RAISE EXCEPTION 'Não é permitido encadear variantes (o pai indicado já é variante de outro produto)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_parent_trigger ON public.products;
CREATE TRIGGER validate_product_parent_trigger
  BEFORE INSERT OR UPDATE OF parent_product_id ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_parent();

-- 3. View de leitura para o catálogo B2B agrupado.
--    Devolve apenas produtos VISÍVEIS no portal B2B:
--      • Produtos sem pai (simples ou pai-de-variantes) sempre.
--      • Filhos só aparecem quando a categoria está em modo 'separate'.
--    Junta a lista de variantes (id + label + attributes + sku + base_price)
--    quando o produto é pai e a categoria está em modo 'grouped'.
CREATE OR REPLACE VIEW public.partner_b2b_catalog_grouped
WITH (security_invoker = true)
AS
WITH category_mode AS (
  SELECT
    p.id AS product_id,
    COALESCE(pc.variant_display_mode, 'grouped') AS display_mode
  FROM public.products p
  LEFT JOIN public.product_categories pc
    ON pc.workspace_id = p.workspace_id
   AND pc.name = p.category
)
SELECT
  p.*,
  cm.display_mode AS variant_display_mode,
  CASE
    WHEN p.parent_product_id IS NULL THEN (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', v.id,
        'sku', v.sku,
        'variant_label', v.variant_label,
        'variant_attributes', v.variant_attributes,
        'base_price', v.base_price,
        'stock_status', v.stock_status,
        'stock_quantity', v.stock_quantity,
        'min_order_quantity', v.min_order_quantity,
        'pack_size', v.pack_size,
        'images', v.images
      ) ORDER BY v.variant_label NULLS LAST, v.sku NULLS LAST), '[]'::jsonb)
      FROM public.products v
      WHERE v.parent_product_id = p.id
        AND v.b2b_published = true
        AND v.status = 'active'
    )
    ELSE '[]'::jsonb
  END AS variants
FROM public.products p
JOIN category_mode cm ON cm.product_id = p.id
WHERE p.b2b_published = true
  AND p.status = 'active'
  AND (
    -- Pais e produtos simples sempre
    p.parent_product_id IS NULL
    -- Filhos só quando a categoria pede 'separate'
    OR cm.display_mode = 'separate'
  );

COMMENT ON VIEW public.partner_b2b_catalog_grouped IS
  'Catálogo B2B com variantes agrupadas conforme variant_display_mode da categoria. Pais agregam variantes em jsonb[]; em modo separate cada filho aparece como linha.';