-- Intenção comercial explícita das relações de produtos (up-sell / down-sell / cross-sell).
ALTER TABLE public.product_relations
  ADD COLUMN IF NOT EXISTS commercial_intent TEXT;

ALTER TABLE public.product_relations
  DROP CONSTRAINT IF EXISTS product_relations_commercial_intent_check;

ALTER TABLE public.product_relations
  ADD CONSTRAINT product_relations_commercial_intent_check
  CHECK (commercial_intent IS NULL OR commercial_intent IN ('upsell', 'downsell', 'cross_sell', 'neutral'));

-- Evidência real usada para justificar a relação (sinais verificáveis do catálogo).
ALTER TABLE public.product_relations
  ADD COLUMN IF NOT EXISTS evidence JSONB;

CREATE INDEX IF NOT EXISTS idx_product_relations_intent
  ON public.product_relations(source_product_id, commercial_intent)
  WHERE is_active = true;

COMMENT ON COLUMN public.product_relations.commercial_intent IS
  'Intenção comercial determinística: upsell (ticket superior), downsell (salvar a venda), cross_sell (complemento), neutral.';
COMMENT ON COLUMN public.product_relations.evidence IS
  'Sinais reais que justificam a relação (marca, categoria, termos da ficha, co-ocorrência em faturas).';