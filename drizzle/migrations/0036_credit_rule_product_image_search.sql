INSERT INTO public.credit_pricing_rules
  (action_key, label, description, credits_cost, module, category, is_active)
VALUES
  ('product_image_search',
   'Pesquisa de imagens de produto',
   'Pesquisa a página oficial do produto e recolhe as fotografias reais de catálogo.',
   1, 'products', 'ai_search', true)
ON CONFLICT (action_key) DO UPDATE
  SET label = EXCLUDED.label,
      description = EXCLUDED.description,
      credits_cost = EXCLUDED.credits_cost,
      module = EXCLUDED.module,
      category = EXCLUDED.category,
      is_active = true;