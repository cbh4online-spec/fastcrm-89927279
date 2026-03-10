
-- C2C Orders table for tracking purchases
CREATE TABLE public.c2c_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.c2c_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  seller_c2c_id UUID REFERENCES public.c2c_sellers(id),
  
  -- Pricing
  item_price NUMERIC NOT NULL,
  shipping_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Shipping
  shipping_method TEXT,
  shipping_carrier TEXT,
  tracking_code TEXT,
  tracking_url TEXT,
  estimated_delivery TEXT,
  shipping_address JSONB,
  
  -- Delivery mode
  delivery_mode TEXT NOT NULL DEFAULT 'shipping',
  meetup_location TEXT,
  meetup_date TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Commission
  commission_id UUID REFERENCES public.c2c_commissions(id),
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Notes
  buyer_notes TEXT,
  seller_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_c2c_orders_workspace ON public.c2c_orders(workspace_id);
CREATE INDEX idx_c2c_orders_buyer ON public.c2c_orders(buyer_id);
CREATE INDEX idx_c2c_orders_seller ON public.c2c_orders(seller_id);
CREATE INDEX idx_c2c_orders_listing ON public.c2c_orders(listing_id);
CREATE INDEX idx_c2c_orders_status ON public.c2c_orders(status);

-- RLS
ALTER TABLE public.c2c_orders ENABLE ROW LEVEL SECURITY;

-- Buyers can see their own orders
CREATE POLICY "Buyers can view own orders"
  ON public.c2c_orders FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- Sellers can see orders for their listings
CREATE POLICY "Sellers can view orders for their listings"
  ON public.c2c_orders FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

-- Sellers can update shipping info on their orders
CREATE POLICY "Sellers can update order shipping"
  ON public.c2c_orders FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- System inserts via service role (checkout function)

-- Enable realtime for order status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.c2c_orders;
