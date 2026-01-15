-- =====================================================
-- PHASE B: Advanced Products Module
-- Bundle components, Sessions/Entitlements, Hybrid products,
-- Maintenance cycles, Matching rules, Product sheets, Images
-- =====================================================

-- Add new fields to products table for advanced types
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS total_units integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_name text DEFAULT 'sessão';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_duration integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS validity_days integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_mode text DEFAULT 'presencial';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS setup_fee numeric DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS recurring_fee numeric DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS billing_frequency text DEFAULT 'monthly';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bundle_price_mode text DEFAULT 'auto';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS commercial_description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS benefits text[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS conditions text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sheet_published boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sheet_slug text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS primary_image_index integer DEFAULT 0;

-- =====================================================
-- 1) BUNDLE COMPONENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.product_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  component_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  is_optional boolean NOT NULL DEFAULT false,
  price_override numeric,
  cost_override numeric,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT no_self_reference CHECK (parent_product_id != component_product_id)
);

-- Enable RLS
ALTER TABLE public.product_components ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_components
CREATE POLICY "Users can view product components in their workspace"
  ON public.product_components FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create product components in their workspace"
  ON public.product_components FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update product components in their workspace"
  ON public.product_components FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete product components in their workspace"
  ON public.product_components FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 2) CLIENT ENTITLEMENTS (Session packages)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.client_entitlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  total_units integer NOT NULL,
  used_units integer NOT NULL DEFAULT 0,
  remaining_units integer GENERATED ALWAYS AS (total_units - used_units) STORED,
  unit_name text NOT NULL DEFAULT 'sessão',
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  expiry_date timestamp with time zone,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_entitlements
CREATE POLICY "Users can view entitlements in their workspace"
  ON public.client_entitlements FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create entitlements in their workspace"
  ON public.client_entitlements FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update entitlements in their workspace"
  ON public.client_entitlements FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete entitlements in their workspace"
  ON public.client_entitlements FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 3) SESSION CONSUMPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.session_consumptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entitlement_id uuid NOT NULL REFERENCES public.client_entitlements(id) ON DELETE CASCADE,
  units_consumed integer NOT NULL DEFAULT 1,
  session_date timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  performed_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_consumptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_consumptions
CREATE POLICY "Users can view consumptions in their workspace"
  ON public.session_consumptions FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create consumptions in their workspace"
  ON public.session_consumptions FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update consumptions in their workspace"
  ON public.session_consumptions FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete consumptions in their workspace"
  ON public.session_consumptions FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Trigger to update used_units on consumption
CREATE OR REPLACE FUNCTION public.update_entitlement_units()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.client_entitlements
    SET used_units = used_units + NEW.units_consumed,
        updated_at = now()
    WHERE id = NEW.entitlement_id;
    
    -- Auto-complete if all units used
    UPDATE public.client_entitlements
    SET status = 'completed', updated_at = now()
    WHERE id = NEW.entitlement_id AND remaining_units <= 0;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.client_entitlements
    SET used_units = GREATEST(0, used_units - OLD.units_consumed),
        updated_at = now()
    WHERE id = OLD.entitlement_id;
    
    -- Reactivate if was completed
    UPDATE public.client_entitlements
    SET status = 'active', updated_at = now()
    WHERE id = OLD.entitlement_id AND status = 'completed' AND remaining_units > 0;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_entitlement_units
  AFTER INSERT OR DELETE ON public.session_consumptions
  FOR EACH ROW EXECUTE FUNCTION public.update_entitlement_units();

-- =====================================================
-- 4) PRODUCT MAINTENANCE CYCLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.product_cycles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('days_after_purchase', 'days_without_session', 'consumption_percent', 'days_before_expiry', 'custom')),
  trigger_value integer NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('create_task', 'send_email', 'send_whatsapp', 'create_opportunity', 'notify_owner', 'start_automation')),
  action_config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_cycles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_cycles
CREATE POLICY "Users can view product cycles in their workspace"
  ON public.product_cycles FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create product cycles in their workspace"
  ON public.product_cycles FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update product cycles in their workspace"
  ON public.product_cycles FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete product cycles in their workspace"
  ON public.product_cycles FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 5) PRODUCT PROGRESSION RULES (Matching)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.product_progressions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  to_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  progression_name text,
  timing_days integer,
  timing_window_start integer,
  timing_window_end integer,
  suggested_message text,
  recommended_action text CHECK (recommended_action IN ('task', 'opportunity', 'campaign', 'automation')),
  confidence_score integer DEFAULT 80,
  is_ai_suggested boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT no_same_product CHECK (from_product_id != to_product_id)
);

-- Enable RLS
ALTER TABLE public.product_progressions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_progressions
CREATE POLICY "Users can view product progressions in their workspace"
  ON public.product_progressions FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create product progressions in their workspace"
  ON public.product_progressions FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update product progressions in their workspace"
  ON public.product_progressions FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete product progressions in their workspace"
  ON public.product_progressions FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 6) PRODUCT IMAGES (enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  is_ai_generated boolean NOT NULL DEFAULT false,
  ai_prompt text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_images
CREATE POLICY "Users can view product images in their workspace"
  ON public.product_images FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create product images in their workspace"
  ON public.product_images FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update product images in their workspace"
  ON public.product_images FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete product images in their workspace"
  ON public.product_images FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 7) SALE SNAPSHOTS (bundle structure at sale time)
-- =====================================================
ALTER TABLE public.proposal_items ADD COLUMN IF NOT EXISTS bundle_snapshot jsonb;
ALTER TABLE public.proposal_items ADD COLUMN IF NOT EXISTS units_sold integer;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_product_components_parent ON public.product_components(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_product_components_component ON public.product_components(component_product_id);
CREATE INDEX IF NOT EXISTS idx_client_entitlements_product ON public.client_entitlements(product_id);
CREATE INDEX IF NOT EXISTS idx_client_entitlements_contact ON public.client_entitlements(contact_id);
CREATE INDEX IF NOT EXISTS idx_client_entitlements_company ON public.client_entitlements(company_id);
CREATE INDEX IF NOT EXISTS idx_client_entitlements_status ON public.client_entitlements(status);
CREATE INDEX IF NOT EXISTS idx_session_consumptions_entitlement ON public.session_consumptions(entitlement_id);
CREATE INDEX IF NOT EXISTS idx_product_cycles_product ON public.product_cycles(product_id);
CREATE INDEX IF NOT EXISTS idx_product_progressions_from ON public.product_progressions(from_product_id);
CREATE INDEX IF NOT EXISTS idx_product_progressions_to ON public.product_progressions(to_product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_products_sheet_slug ON public.products(sheet_slug) WHERE sheet_slug IS NOT NULL;