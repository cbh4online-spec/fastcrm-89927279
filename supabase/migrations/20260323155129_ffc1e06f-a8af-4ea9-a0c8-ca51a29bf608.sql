
-- =============================================
-- MARKETPLACE: Credits → Subscription Model Migration
-- =============================================

-- 1. Add new columns to marketplace_modules
ALTER TABLE public.marketplace_modules
  ADD COLUMN IF NOT EXISTS pricing_model TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS price_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Add comment for pricing_model values
COMMENT ON COLUMN public.marketplace_modules.pricing_model IS 'free | included | monthly | template';
COMMENT ON COLUMN public.marketplace_modules.min_plan IS 'free | growth | pro';

-- 2. Add new columns to workspace_modules (installations)
ALTER TABLE public.workspace_modules
  ADD COLUMN IF NOT EXISTS pricing_model TEXT,
  ADD COLUMN IF NOT EXISTS price_eur NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_sub_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- 3. Create group_broadcasts table for broadcast feature
CREATE TABLE IF NOT EXISTS public.group_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  message TEXT,
  product_id UUID,
  target_groups UUID[] DEFAULT '{}',
  sent_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage broadcasts"
  ON public.group_broadcasts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = group_broadcasts.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- 4. Seed / Update marketplace_modules with new pricing model
-- Format: pricing_model, price_eur, min_plan

-- ═══ FREE modules ═══
UPDATE public.marketplace_modules SET pricing_model = 'free', price_eur = 0, min_plan = 'free'
WHERE slug IN ('crm-core', 'comunicacao', 'automacoes', 'calendario', 'formularios', 'produtividade', 'relatorios', 'perfis-actividade');

-- ═══ INCLUDED in Growth+ ═══
UPDATE public.marketplace_modules SET pricing_model = 'included', price_eur = 0, min_plan = 'growth'
WHERE slug IN (
  'ia-assistentes', 'ai-copilot', 'ai-sugestoes', 'ai-knowledge-base',
  'ai-motor-conversacional', 'ai-assistentes-avancados',
  'seo-growth', 'landing-pages', 'marketplace-c2c', 'fastclub',
  'instagram-looter', 'credito', 'fichas-produto', 'loja-online',
  'notas-encomenda', 'pacotes', 'portal-cliente', 'video-reunioes'
);

-- ═══ INCLUDED in Pro ═══
UPDATE public.marketplace_modules SET pricing_model = 'included', price_eur = 0, min_plan = 'pro'
WHERE slug IN ('ai-ocr', 'ai-agentes');

-- ═══ MONTHLY add-ons ═══
UPDATE public.marketplace_modules SET pricing_model = 'monthly', price_eur = 89, min_plan = 'growth'
WHERE slug = 'b2b-portal';

UPDATE public.marketplace_modules SET pricing_model = 'monthly', price_eur = 49, min_plan = 'growth'
WHERE slug = 'procurement';

UPDATE public.marketplace_modules SET pricing_model = 'monthly', price_eur = 49, min_plan = 'growth'
WHERE slug = 'student-journey';

UPDATE public.marketplace_modules SET pricing_model = 'monthly', price_eur = 49, min_plan = 'growth'
WHERE slug = 'security-ops';

UPDATE public.marketplace_modules SET pricing_model = 'monthly', price_eur = 29, min_plan = 'growth'
WHERE slug = 'intermediacao-credito';

UPDATE public.marketplace_modules SET pricing_model = 'monthly', price_eur = 49, min_plan = 'pro'
WHERE slug = 'ai-agents-advanced';

-- ═══ TEMPLATES ═══
UPDATE public.marketplace_modules SET pricing_model = 'template', price_eur = 0, min_plan = 'free'
WHERE slug IN ('template-imobiliario', 'template-saude', 'template-educacao', 'template-consultoria');

-- 5. Migrate existing installations to new model
UPDATE public.workspace_modules wm
SET pricing_model = mm.pricing_model,
    price_eur = mm.price_eur
FROM public.marketplace_modules mm
WHERE wm.module_id = mm.id
AND wm.pricing_model IS NULL;

-- 6. Update RLS policy for marketplace_modules to also allow 'published' status
DROP POLICY IF EXISTS "Anyone can view active modules" ON public.marketplace_modules;
CREATE POLICY "Anyone can view active modules"
  ON public.marketplace_modules FOR SELECT
  USING (status IN ('active', 'published'));
