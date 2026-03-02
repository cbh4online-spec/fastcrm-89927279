
CREATE TABLE public.platform_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type text NOT NULL DEFAULT 'plan',
  config_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  currency text DEFAULT 'EUR',
  features jsonb DEFAULT '[]'::jsonb,
  highlights jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  is_highlighted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.platform_pricing_config ENABLE ROW LEVEL SECURITY;

-- Public read for landing page
CREATE POLICY "Anyone can read active pricing configs"
  ON public.platform_pricing_config FOR SELECT
  USING (is_active = true);

-- Super admins can manage
CREATE POLICY "Super admins can manage pricing configs"
  ON public.platform_pricing_config FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Seed plans
INSERT INTO public.platform_pricing_config (config_type, config_key, name, description, price_monthly, price_yearly, features, metadata, display_order, is_highlighted) VALUES
('plan', 'starter', 'Starter', 'Para começar gratuitamente', 0, 0,
 '["1-3 utilizadores", "CRM Core", "Health Score básico", "1 Pipeline", "3 Automações", "500 emails/mês"]'::jsonb,
 '{"icon": "Zap", "color": "hsl(142, 76%, 36%)", "badge": null, "cta_key": "startFree"}'::jsonb,
 1, false),
('plan', 'growth', 'Growth', 'Para equipas em crescimento', 49, 470,
 '["10 utilizadores", "Multi-pipeline", "Stage Benchmarks", "Automação avançada", "Marketplace", "Sugestões IA", "500 créditos IA/mês", "5000 emails/mês"]'::jsonb,
 '{"icon": "Sparkles", "color": "hsl(221, 83%, 53%)", "badge": "mostPopular", "cta_key": "startFreeUpgrade"}'::jsonb,
 2, true),
('plan', 'scale', 'Scale', 'Para empresas que precisam de mais', 149, 1430,
 '["Utilizadores ilimitados", "Inteligência avançada", "Automações avançadas", "Acesso API", "Roles avançados", "Suporte prioritário", "White Label", "5000 créditos IA/mês"]'::jsonb,
 '{"icon": "Crown", "color": "hsl(250, 83%, 60%)", "badge": "enterprise", "cta_key": "startFreeUpgrade"}'::jsonb,
 3, false);
