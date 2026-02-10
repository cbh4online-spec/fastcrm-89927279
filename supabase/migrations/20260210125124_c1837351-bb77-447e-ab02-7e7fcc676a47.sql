
-- 1. Add product_condition column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_condition TEXT DEFAULT NULL;

-- 2. Create store_offers table
CREATE TABLE public.store_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  offered_price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  counter_price NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'cancelled')),
  message TEXT,
  admin_message TEXT,
  coupon_code TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_offers ENABLE ROW LEVEL SECURITY;

-- Public can insert offers
CREATE POLICY "Anyone can create offers" ON public.store_offers
  FOR INSERT WITH CHECK (true);

-- Public can read own offers by email
CREATE POLICY "Anyone can read offers by email" ON public.store_offers
  FOR SELECT USING (true);

-- Authenticated users can update (admin)
CREATE POLICY "Authenticated users can update offers" ON public.store_offers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_offers.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_store_offers_updated_at
  BEFORE UPDATE ON public.store_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_store_offers_workspace ON public.store_offers(workspace_id, status);
CREATE INDEX idx_store_offers_product ON public.store_offers(product_id, status);
CREATE INDEX idx_store_offers_email ON public.store_offers(customer_email, status);
