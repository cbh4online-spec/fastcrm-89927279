-- Add image_url to product_categories
ALTER TABLE public.product_categories 
ADD COLUMN image_url TEXT;

-- Create price_tables table for pricing management
CREATE TABLE public.price_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  table_type TEXT NOT NULL DEFAULT 'segment' CHECK (table_type IN ('segment', 'volume', 'promotional')),
  -- For segment-based pricing
  customer_segment TEXT, -- e.g., 'reseller', 'partner', 'end_customer'
  -- For promotional pricing
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  -- General
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0, -- Higher priority = applied first
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(workspace_id, name)
);

-- Create price_table_items for individual product prices
CREATE TABLE public.price_table_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_table_id UUID NOT NULL REFERENCES public.price_tables(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  -- Base pricing
  unit_price NUMERIC(12,2) NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  -- Volume pricing tiers (JSON array)
  volume_tiers JSONB, -- [{min_qty: 1, max_qty: 10, price: 100}, {min_qty: 11, max_qty: 50, price: 90}]
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(price_table_id, product_id)
);

-- Enable RLS
ALTER TABLE public.price_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_table_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for price_tables
CREATE POLICY "Users can view price tables in their workspace"
ON public.price_tables FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create price tables in their workspace"
ON public.price_tables FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update price tables in their workspace"
ON public.price_tables FOR UPDATE
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete price tables in their workspace"
ON public.price_tables FOR DELETE
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS policies for price_table_items (via price_tables workspace)
CREATE POLICY "Users can view price table items"
ON public.price_table_items FOR SELECT
USING (price_table_id IN (
  SELECT id FROM public.price_tables WHERE workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Users can create price table items"
ON public.price_table_items FOR INSERT
WITH CHECK (price_table_id IN (
  SELECT id FROM public.price_tables WHERE workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Users can update price table items"
ON public.price_table_items FOR UPDATE
USING (price_table_id IN (
  SELECT id FROM public.price_tables WHERE workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Users can delete price table items"
ON public.price_table_items FOR DELETE
USING (price_table_id IN (
  SELECT id FROM public.price_tables WHERE workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
));

-- Triggers for updated_at
CREATE TRIGGER update_price_tables_updated_at
BEFORE UPDATE ON public.price_tables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_price_table_items_updated_at
BEFORE UPDATE ON public.price_table_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_price_tables_workspace ON public.price_tables(workspace_id);
CREATE INDEX idx_price_table_items_table ON public.price_table_items(price_table_id);
CREATE INDEX idx_price_table_items_product ON public.price_table_items(product_id);

-- Storage bucket for category images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for category images
CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Authenticated users can upload category images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'category-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update category images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'category-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete category images"
ON storage.objects FOR DELETE
USING (bucket_id = 'category-images' AND auth.role() = 'authenticated');