-- =====================================================================
-- B2B Checkout Management: settings, manual kits, related-product rules
-- =====================================================================

-- 1. Settings por workspace --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_checkout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE,
  show_related BOOLEAN NOT NULL DEFAULT true,
  show_kit BOOLEAN NOT NULL DEFAULT true,
  show_promotions BOOLEAN NOT NULL DEFAULT true,
  show_best_sellers BOOLEAN NOT NULL DEFAULT true,
  free_shipping_threshold NUMERIC(10,2) NOT NULL DEFAULT 150,
  related_mode TEXT NOT NULL DEFAULT 'manual_first' CHECK (related_mode IN ('category','manual','manual_first')),
  kit_mode TEXT NOT NULL DEFAULT 'manual' CHECK (kit_mode IN ('manual','auto','both')),
  auto_kit_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_checkout_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view checkout settings"
  ON public.b2b_checkout_settings FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = b2b_checkout_settings.workspace_id AND wm.user_id = auth.uid())
  );

CREATE POLICY "Admins manage checkout settings"
  ON public.b2b_checkout_settings FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = b2b_checkout_settings.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = b2b_checkout_settings.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
  );

-- 2. Kits manuais (curadoria) -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_checkout_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  -- Trigger: kit aparece quando o carrinho contém pelo menos um destes produtos (vazio = sempre)
  trigger_product_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_b2b_kits_workspace ON public.b2b_checkout_kits(workspace_id) WHERE deleted_at IS NULL;

ALTER TABLE public.b2b_checkout_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view kits"
  ON public.b2b_checkout_kits FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_super_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = b2b_checkout_kits.workspace_id AND wm.user_id = auth.uid())
    )
  );

CREATE POLICY "Admins manage kits"
  ON public.b2b_checkout_kits FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = b2b_checkout_kits.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = b2b_checkout_kits.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
  );

-- 3. Regras de produtos relacionados manuais --------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_checkout_related_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  source_product_id UUID NOT NULL,
  related_product_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (workspace_id, source_product_id)
);

CREATE INDEX IF NOT EXISTS idx_b2b_related_workspace ON public.b2b_checkout_related_rules(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_b2b_related_source ON public.b2b_checkout_related_rules(source_product_id) WHERE deleted_at IS NULL;

ALTER TABLE public.b2b_checkout_related_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view related rules"
  ON public.b2b_checkout_related_rules FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_super_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = b2b_checkout_related_rules.workspace_id AND wm.user_id = auth.uid())
    )
  );

CREATE POLICY "Admins manage related rules"
  ON public.b2b_checkout_related_rules FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = b2b_checkout_related_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = b2b_checkout_related_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin'))
  );

-- 4. Triggers de updated_at -------------------------------------------------
CREATE TRIGGER trg_b2b_checkout_settings_updated
  BEFORE UPDATE ON public.b2b_checkout_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_b2b_checkout_kits_updated
  BEFORE UPDATE ON public.b2b_checkout_kits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_b2b_checkout_related_rules_updated
  BEFORE UPDATE ON public.b2b_checkout_related_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();