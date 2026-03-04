
CREATE TABLE public.c2c_public_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  listing_id UUID NOT NULL REFERENCES public.c2c_listings(id),
  seller_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  offered_price NUMERIC NOT NULL,
  original_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  message TEXT,
  status TEXT DEFAULT 'pending',
  admin_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.c2c_public_offers ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous visitors)
CREATE POLICY "Anyone can create public offers"
  ON public.c2c_public_offers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Seller can view their own offers
CREATE POLICY "Sellers can view their public offers"
  ON public.c2c_public_offers
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

-- Seller can update (accept/reject) their offers
CREATE POLICY "Sellers can update their public offers"
  ON public.c2c_public_offers
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid());
