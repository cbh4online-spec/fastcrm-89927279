-- Adiciona custo operacional sugerido às regras de pricing (global e por categoria)
ALTER TABLE public.product_pricing_rules
  ADD COLUMN IF NOT EXISTS default_operational_cost_pct numeric NULL;

COMMENT ON COLUMN public.product_pricing_rules.default_operational_cost_pct
  IS 'Custo operacional sugerido em % do preço líquido. Usado como pré-preenchimento ao criar produtos. Resolução: produto > regra de categoria > regra global.';