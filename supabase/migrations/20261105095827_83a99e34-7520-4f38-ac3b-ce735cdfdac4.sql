INSERT INTO public.marketplace_modules (slug, name, tagline, description, category, icon, status, internal_type, publisher, min_plan, price_eur, pricing_model, pricing, version)
VALUES ('ai-commerce', 'AI Commerce', 'Catálogo pronto para IA, feeds e canais externos',
 'Prepara o catálogo para motores de IA, agentes de compra e feeds (Google Merchant, Meta, XML), com gate de qualidade e analytics.',
 'sales', 'Sparkles', 'active', 'native_feature', 'FastCRM', 'free', 49, 'monthly',
 '{"type":"fixed_monthly","base_price":49,"currency":"EUR","trial_days":14}'::jsonb, '1.0.0')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.workspace_modules (workspace_id, module_id, status, subscribed_by)
SELECT wm.workspace_id, ai.id, wm.status, wm.subscribed_by
FROM public.workspace_modules wm
JOIN public.marketplace_modules os ON os.id = wm.module_id AND os.slug = 'online-store'
CROSS JOIN public.marketplace_modules ai
WHERE ai.slug = 'ai-commerce' AND wm.status IN ('active','trial')
  AND NOT EXISTS (SELECT 1 FROM public.workspace_modules x WHERE x.workspace_id = wm.workspace_id AND x.module_id = ai.id);