
-- Seller premium subscriptions
CREATE TABLE public.c2c_seller_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.c2c_sellers(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'premium' CHECK (plan IN ('premium', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  price_amount NUMERIC(10,2) NOT NULL DEFAULT 9.99,
  currency TEXT NOT NULL DEFAULT 'EUR',
  features JSONB DEFAULT '{"badge": true, "extra_listings": 5, "priority_support": true, "lower_commission": 3}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.c2c_seller_subscriptions ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own subscriptions
CREATE POLICY "Sellers can view own subscriptions"
ON public.c2c_seller_subscriptions FOR SELECT
USING (
  seller_id IN (
    SELECT id FROM public.c2c_sellers WHERE user_id = auth.uid()
  )
);

-- Service role / admin can manage
CREATE POLICY "Service role manages subscriptions"
ON public.c2c_seller_subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = c2c_seller_subscriptions.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

-- Indexes
CREATE INDEX idx_c2c_seller_subs_seller ON public.c2c_seller_subscriptions(seller_id);
CREATE INDEX idx_c2c_seller_subs_workspace ON public.c2c_seller_subscriptions(workspace_id);
CREATE INDEX idx_c2c_seller_subs_status ON public.c2c_seller_subscriptions(status);

-- Trigger for updated_at
CREATE TRIGGER update_c2c_seller_subscriptions_updated_at
BEFORE UPDATE ON public.c2c_seller_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
