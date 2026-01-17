-- Create saas_categories table for organizing SaaS modules
CREATE TABLE public.saas_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create saas_pricing_tables for SaaS pricing management
CREATE TABLE public.saas_pricing_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pricing_type TEXT NOT NULL DEFAULT 'segment' CHECK (pricing_type IN ('segment', 'volume', 'promotional', 'tiered')),
  target_segment TEXT,
  base_price NUMERIC(10,2),
  discount_percent NUMERIC(5,2),
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create saas_pricing_items for specific plan/module pricing
CREATE TABLE public.saas_pricing_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pricing_table_id UUID NOT NULL REFERENCES public.saas_pricing_tables(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  volume_tiers JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pricing_table_id, plan_key)
);

-- Enable RLS
ALTER TABLE public.saas_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_pricing_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_pricing_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saas_categories
CREATE POLICY "Users can view saas categories in their workspace" 
  ON public.saas_categories FOR SELECT 
  USING (
    workspace_id IS NULL OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage saas categories" 
  ON public.saas_categories FOR ALL
  USING (
    workspace_id IS NULL OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for saas_pricing_tables
CREATE POLICY "Users can view saas pricing tables in their workspace" 
  ON public.saas_pricing_tables FOR SELECT 
  USING (
    workspace_id IS NULL OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage saas pricing tables" 
  ON public.saas_pricing_tables FOR ALL
  USING (
    workspace_id IS NULL OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for saas_pricing_items
CREATE POLICY "Users can view saas pricing items" 
  ON public.saas_pricing_items FOR SELECT 
  USING (
    pricing_table_id IN (
      SELECT id FROM saas_pricing_tables WHERE workspace_id IS NULL OR workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage saas pricing items" 
  ON public.saas_pricing_items FOR ALL
  USING (
    pricing_table_id IN (
      SELECT id FROM saas_pricing_tables WHERE workspace_id IS NULL OR workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Update timestamps trigger
CREATE TRIGGER update_saas_categories_updated_at
  BEFORE UPDATE ON public.saas_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saas_pricing_tables_updated_at
  BEFORE UPDATE ON public.saas_pricing_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saas_pricing_items_updated_at
  BEFORE UPDATE ON public.saas_pricing_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();