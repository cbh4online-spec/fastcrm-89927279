
-- Expand relation_type check constraint to include new types
ALTER TABLE public.product_relations DROP CONSTRAINT IF EXISTS product_relations_relation_type_check;
ALTER TABLE public.product_relations ADD CONSTRAINT product_relations_relation_type_check
  CHECK (relation_type IN ('related', 'compatible', 'bundle', 'accessory', 'alternative', 'required', 'upgrade'));
