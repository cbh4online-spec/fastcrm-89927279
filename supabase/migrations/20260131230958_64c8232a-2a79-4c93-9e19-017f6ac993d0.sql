-- =====================================================
-- Fase 5: Client Experience (B2B Portal)
-- Favorites + Business Types for Products
-- =====================================================

-- 1. Create client_favorites table
CREATE TABLE public.client_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID NOT NULL REFERENCES public.client_users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT client_favorites_unique UNIQUE (client_user_id, product_id)
);

-- Create index for faster lookups
CREATE INDEX idx_client_favorites_client_user ON public.client_favorites(client_user_id);
CREATE INDEX idx_client_favorites_product ON public.client_favorites(product_id);

-- Enable RLS
ALTER TABLE public.client_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_favorites
-- Clients can only see their own favorites
CREATE POLICY "Clients can view own favorites"
  ON public.client_favorites
  FOR SELECT
  USING (client_user_id IN (
    SELECT id FROM public.client_users WHERE auth_user_id = auth.uid()
  ));

-- Clients can add to their own favorites
CREATE POLICY "Clients can add own favorites"
  ON public.client_favorites
  FOR INSERT
  WITH CHECK (client_user_id IN (
    SELECT id FROM public.client_users WHERE auth_user_id = auth.uid()
  ));

-- Clients can remove from their own favorites
CREATE POLICY "Clients can delete own favorites"
  ON public.client_favorites
  FOR DELETE
  USING (client_user_id IN (
    SELECT id FROM public.client_users WHERE auth_user_id = auth.uid()
  ));

-- Workspace members can view all favorites in their workspace
CREATE POLICY "Workspace members can view favorites"
  ON public.client_favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      JOIN public.workspace_members wm ON cu.workspace_id = wm.workspace_id
      WHERE cu.id = client_favorites.client_user_id
      AND wm.user_id = auth.uid()
    )
  );

-- 2. Add business_types array to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS business_types TEXT[] DEFAULT '{}';

-- Create index for faster array searches
CREATE INDEX IF NOT EXISTS idx_products_business_types ON public.products USING GIN(business_types);

-- Add comment for documentation
COMMENT ON COLUMN public.products.business_types IS 'Array of business types this product is targeted for: hairdresser, clinic, therapist, aesthetics, pharmacy, other';