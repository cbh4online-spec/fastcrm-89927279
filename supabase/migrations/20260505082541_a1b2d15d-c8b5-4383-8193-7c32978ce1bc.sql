INSERT INTO public.credit_pricing_rules (action_key, label, description, credits_cost, module, category, is_active)
VALUES (
  'b2b_banner_ai_image',
  'Gerar imagem do banner com IA',
  'Gera uma imagem de hero (16:9) para um banner do Portal B2B usando IA (Nano Banana).',
  5,
  'b2b_portal',
  'ai_generation',
  true
)
ON CONFLICT (action_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  credits_cost = EXCLUDED.credits_cost,
  module = EXCLUDED.module,
  category = EXCLUDED.category,
  is_active = true;