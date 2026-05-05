INSERT INTO public.credit_pricing_rules (action_key, label, description, credits_cost, module, category, is_active)
VALUES (
  'b2b_banner_ai_generate',
  'Gerar banner B2B com IA',
  'Geração assistida por IA do conteúdo de um banner do Portal B2B (eyebrow, título, subtítulo, CTA) a partir de uma descrição em linguagem natural.',
  2,
  'b2b_portal',
  'ai',
  true
)
ON CONFLICT (action_key) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    credits_cost = EXCLUDED.credits_cost,
    module = EXCLUDED.module,
    category = EXCLUDED.category,
    is_active = true;