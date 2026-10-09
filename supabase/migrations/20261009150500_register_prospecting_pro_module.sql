-- Register the module required by the Professionals page and search guard.
-- Existing catalogue settings and workspace installations remain untouched.
INSERT INTO public.marketplace_modules (
  slug, name, tagline, description, category, icon,
  target_audience, internal_type, status, version,
  pricing_model, price_eur, min_plan, pricing
)
VALUES (
  'prospecting-pro',
  'Prospecção Profissional',
  'Descobrir e qualificar profissionais',
  'Pesquisa e qualificação de profissionais para adicionar ao CRM. Requer um plano Growth ou Scale ativo e créditos disponíveis para cada pesquisa.',
  'prospecting',
  'UserPlus',
  'Equipas B2B que vendem a profissionais',
  'ai_service',
  'active',
  '1.0.0',
  'included',
  0,
  'growth',
  '{"type":"credits","base_price":0,"currency":"EUR"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- The module already exists in production as a €59 monthly add-on. Only the
-- eligibility floor was wrong; preserve its price, Stripe mapping and installs.
UPDATE public.marketplace_modules
SET min_plan = 'growth'
WHERE slug = 'prospecting-pro' AND min_plan IS DISTINCT FROM 'growth';
