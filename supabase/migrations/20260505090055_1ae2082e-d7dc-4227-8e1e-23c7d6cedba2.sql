INSERT INTO public.credit_pricing_rules (action_key, label, description, credits_cost, module, category, is_active)
VALUES (
  'b2b_checkout_ai_suggestion',
  'Sugestão IA — Checkout B2B',
  'Geração assistida por IA de um kit poupança ou de produtos relacionados para o checkout do Portal B2B.',
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