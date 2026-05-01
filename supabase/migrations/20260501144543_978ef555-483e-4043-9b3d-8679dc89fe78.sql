ALTER TABLE public.partner_order_items
  ADD COLUMN IF NOT EXISTS parent_product_id uuid NULL REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label text NULL,
  ADD COLUMN IF NOT EXISTS variant_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_partner_order_items_parent_product
  ON public.partner_order_items(parent_product_id)
  WHERE parent_product_id IS NOT NULL;

COMMENT ON COLUMN public.partner_order_items.parent_product_id IS 'Produto pai quando o item é variante (snapshot)';
COMMENT ON COLUMN public.partner_order_items.variant_label IS 'Rótulo da variante no momento da compra (ex: 50ml)';
COMMENT ON COLUMN public.partner_order_items.variant_attributes IS 'Atributos da variante no momento da compra';