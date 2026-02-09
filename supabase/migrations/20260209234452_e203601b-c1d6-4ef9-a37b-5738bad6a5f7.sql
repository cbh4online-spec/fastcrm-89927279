
-- ============================================
-- CRM-DRIVEN STORE: Conditional Offers, Dynamic Pricing, Hidden Products, AI Offers
-- ============================================

-- 1. Add store_visibility to products (public | unlisted | hidden)
-- public = normal store listing
-- unlisted = only accessible via direct link
-- hidden = only accessible via automation/CRM offers
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS store_visibility text NOT NULL DEFAULT 'public';

-- 2. Conditional Offers (CRM-based rules for store)
CREATE TABLE IF NOT EXISTS public.store_conditional_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  
  -- Conditions (CRM context)
  conditions jsonb NOT NULL DEFAULT '{}',
  -- Example conditions:
  -- { "client_type": ["b2b"], "pipeline_stage": ["negotiation", "proposal"], 
  --   "min_total_spent": 1000, "segment_ids": ["uuid"], "price_tier_ids": ["uuid"],
  --   "tags": ["vip"], "min_orders": 3 }
  
  -- Actions
  offer_type text NOT NULL DEFAULT 'discount', -- discount | special_price | free_product | bundle_deal | free_shipping
  discount_percentage numeric,
  discount_fixed numeric,
  special_price numeric,
  free_product_ids uuid[],
  min_order_value numeric,
  
  -- Scope
  applies_to text NOT NULL DEFAULT 'all', -- all | specific_products | specific_categories
  product_ids uuid[],
  category_ids text[],
  
  -- Limits
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  starts_at timestamp with time zone,
  expires_at timestamp with time zone,
  
  -- Metadata
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Dynamic Pricing Rules (segment-based pricing)
CREATE TABLE IF NOT EXISTS public.store_dynamic_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  
  -- Segment targeting
  segment_id uuid REFERENCES public.marketing_segments(id) ON DELETE SET NULL,
  price_tier_id uuid REFERENCES public.client_price_tiers(id) ON DELETE SET NULL,
  client_type text, -- b2b | b2c | vip
  
  -- Pricing rule
  pricing_type text NOT NULL DEFAULT 'percentage_discount', 
  -- percentage_discount | fixed_discount | fixed_price | markup
  value numeric NOT NULL DEFAULT 0,
  
  -- Scope
  applies_to text NOT NULL DEFAULT 'all', -- all | specific_products | specific_categories
  product_ids uuid[],
  category_ids text[],
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. AI-Generated Offers (personalized offers created by AI)
CREATE TABLE IF NOT EXISTS public.store_ai_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  
  -- Offer details
  title text NOT NULL,
  description text,
  offer_type text NOT NULL DEFAULT 'discount', -- discount | bundle | upsell | cross_sell | retention
  
  -- AI reasoning
  ai_reasoning text,
  confidence_score numeric,
  based_on jsonb, -- { "purchase_history": [...], "browsing_data": [...], "crm_signals": [...] }
  
  -- Offer content
  product_ids uuid[],
  discount_percentage numeric,
  special_price numeric,
  coupon_code text,
  
  -- Delivery
  delivery_channel text NOT NULL DEFAULT 'store', -- store | email | whatsapp | sms
  delivered_at timestamp with time zone,
  
  -- Lifecycle
  status text NOT NULL DEFAULT 'pending', -- pending | approved | delivered | redeemed | expired | rejected
  approved_by uuid,
  approved_at timestamp with time zone,
  redeemed_at timestamp with time zone,
  expires_at timestamp with time zone,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Store offer redemption tracking
CREATE TABLE IF NOT EXISTS public.store_offer_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  offer_id uuid, -- conditional offer id
  ai_offer_id uuid REFERENCES public.store_ai_offers(id) ON DELETE SET NULL,
  pricing_rule_id uuid REFERENCES public.store_dynamic_pricing(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.store_orders(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  
  offer_type text NOT NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  original_total numeric,
  final_total numeric,
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.store_conditional_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_dynamic_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_ai_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_offer_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies for workspace members
CREATE POLICY "Workspace members manage conditional offers" ON public.store_conditional_offers
  FOR ALL USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  );

CREATE POLICY "Workspace members manage dynamic pricing" ON public.store_dynamic_pricing
  FOR ALL USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  );

CREATE POLICY "Workspace members manage AI offers" ON public.store_ai_offers
  FOR ALL USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  );

CREATE POLICY "Workspace members view redemptions" ON public.store_offer_redemptions
  FOR ALL USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  );

-- Public read for store offers (needed for storefront to evaluate offers)
CREATE POLICY "Public read conditional offers" ON public.store_conditional_offers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read dynamic pricing" ON public.store_dynamic_pricing
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read AI offers by contact" ON public.store_ai_offers
  FOR SELECT USING (status IN ('approved', 'delivered'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_conditional_offers_workspace ON public.store_conditional_offers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_store_dynamic_pricing_workspace ON public.store_dynamic_pricing(workspace_id);
CREATE INDEX IF NOT EXISTS idx_store_ai_offers_contact ON public.store_ai_offers(contact_id);
CREATE INDEX IF NOT EXISTS idx_store_ai_offers_workspace ON public.store_ai_offers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_store_offer_redemptions_order ON public.store_offer_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_products_store_visibility ON public.products(store_visibility);
