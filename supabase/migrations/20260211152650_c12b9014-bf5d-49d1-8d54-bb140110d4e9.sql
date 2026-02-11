
-- Tabela de ofertas C2C
CREATE TABLE public.c2c_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  listing_id UUID NOT NULL REFERENCES public.c2c_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  offer_price NUMERIC NOT NULL,
  counter_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.c2c_offers ENABLE ROW LEVEL SECURITY;

-- Buyer can see and create their own offers
CREATE POLICY "Buyers can view their own offers"
  ON public.c2c_offers FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view offers on their listings"
  ON public.c2c_offers FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can create offers"
  ON public.c2c_offers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update offers on their listings"
  ON public.c2c_offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can update their own offers"
  ON public.c2c_offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Super admins can manage all offers"
  ON public.c2c_offers FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Tabela de notificacoes C2C
CREATE TABLE public.c2c_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  listing_id UUID REFERENCES public.c2c_listings(id) ON DELETE CASCADE,
  related_user_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.c2c_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.c2c_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.c2c_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.c2c_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins can manage all notifications"
  ON public.c2c_notifications FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Contadores para estatisticas por listing
ALTER TABLE public.c2c_listings ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;
ALTER TABLE public.c2c_listings ADD COLUMN IF NOT EXISTS messages_count INTEGER DEFAULT 0;

-- Enable realtime for offers and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.c2c_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.c2c_notifications;
