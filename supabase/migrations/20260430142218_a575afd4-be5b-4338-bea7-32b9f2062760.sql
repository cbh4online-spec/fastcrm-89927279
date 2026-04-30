INSERT INTO public.credit_pricing_rules
  (action_key, label, description, credits_cost, module, category, is_active)
VALUES
  ('product_ocr_generate_content',
   'Geração de Conteúdo Comercial (OCR)',
   'Gera descrições, argumentário de venda e textos de catálogo a partir do documento OCR.',
   5, 'products', 'ai_generation', true)
ON CONFLICT (action_key) DO NOTHING;