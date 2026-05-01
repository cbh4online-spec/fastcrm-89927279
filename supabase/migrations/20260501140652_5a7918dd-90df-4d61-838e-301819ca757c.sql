-- 1. Adicionar campos de variantes a products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variant_parent_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS variant_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS variant_label text;

CREATE INDEX IF NOT EXISTS idx_products_variant_parent_id ON public.products(variant_parent_id) WHERE variant_parent_id IS NOT NULL;

-- 2. Modo de apresentação por categoria
ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS variant_display_mode text NOT NULL DEFAULT 'grouped'
    CHECK (variant_display_mode IN ('grouped', 'separate'));

-- 3. Trigger validação: não encadear (pai não pode ter pai) + mesmo workspace
CREATE OR REPLACE FUNCTION public.validate_product_variant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_workspace uuid;
  parent_has_parent uuid;
BEGIN
  IF NEW.variant_parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.variant_parent_id = NEW.id THEN
    RAISE EXCEPTION 'Um produto não pode ser variante de si próprio';
  END IF;

  SELECT workspace_id, variant_parent_id INTO parent_workspace, parent_has_parent
  FROM public.products WHERE id = NEW.variant_parent_id;

  IF parent_workspace IS NULL THEN
    RAISE EXCEPTION 'Produto-pai não encontrado';
  END IF;

  IF parent_workspace <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Variante deve pertencer ao mesmo workspace do produto-pai';
  END IF;

  IF parent_has_parent IS NOT NULL THEN
    RAISE EXCEPTION 'Não é permitido encadear variantes (o pai já é uma variante)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_variant_trigger ON public.products;
CREATE TRIGGER validate_product_variant_trigger
  BEFORE INSERT OR UPDATE OF variant_parent_id ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_variant();