
-- 1. Add slug to c2c_listings
ALTER TABLE public.c2c_listings ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS c2c_listings_slug_ws_unique ON public.c2c_listings(workspace_id, slug);

CREATE OR REPLACE FUNCTION public.generate_c2c_listing_slug()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(NEW.title, ''), '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS c2c_listing_slug_trigger ON public.c2c_listings;
CREATE TRIGGER c2c_listing_slug_trigger BEFORE INSERT ON public.c2c_listings FOR EACH ROW EXECUTE FUNCTION public.generate_c2c_listing_slug();

-- 2. Add new columns to c2c_sellers
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'pending';
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS payout_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS balance_available INTEGER DEFAULT 0;
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS balance_pending INTEGER DEFAULT 0;
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none';
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS verification_documents JSONB DEFAULT '[]';
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic';
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS max_active_listings INTEGER DEFAULT 5;
ALTER TABLE public.c2c_sellers ADD COLUMN IF NOT EXISTS boost_credits INTEGER DEFAULT 0;

-- 3. Add missing columns to c2c_reviews
ALTER TABLE public.c2c_reviews ADD COLUMN IF NOT EXISTS transaction_id UUID;
ALTER TABLE public.c2c_reviews ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.c2c_reviews ADD COLUMN IF NOT EXISTS buyer_email TEXT;
ALTER TABLE public.c2c_reviews ADD COLUMN IF NOT EXISTS reply TEXT;
ALTER TABLE public.c2c_reviews ADD COLUMN IF NOT EXISTS reply_at TIMESTAMPTZ;
ALTER TABLE public.c2c_reviews ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT true;
ALTER TABLE public.c2c_reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- 4. Add missing columns to c2c_payouts
ALTER TABLE public.c2c_payouts ADD COLUMN IF NOT EXISTS seller_id UUID;
ALTER TABLE public.c2c_payouts ADD COLUMN IF NOT EXISTS stripe_payout_id TEXT;
ALTER TABLE public.c2c_payouts ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE public.c2c_payouts ADD COLUMN IF NOT EXISTS transactions UUID[];
ALTER TABLE public.c2c_payouts ADD COLUMN IF NOT EXISTS failed_reason TEXT;

-- 5. Create transactions table
CREATE TABLE public.c2c_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.c2c_listings(id) ON DELETE SET NULL,
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  buyer_phone TEXT,
  amount_total INTEGER NOT NULL,
  amount_seller INTEGER NOT NULL,
  amount_fee INTEGER NOT NULL,
  currency TEXT DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending',
  escrow_released_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  stripe_refund_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create escrow table
CREATE TABLE public.c2c_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.c2c_transactions(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'holding',
  release_scheduled_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  released_by UUID,
  release_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create disputes table
CREATE TABLE public.c2c_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES public.c2c_transactions(id) ON DELETE CASCADE NOT NULL,
  opened_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Create moderation queue
CREATE TABLE IF NOT EXISTS public.c2c_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL,
  reported_by UUID,
  report_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Create seller tiers
CREATE TABLE IF NOT EXISTS public.c2c_seller_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  tier_name TEXT NOT NULL,
  max_active_listings INTEGER NOT NULL DEFAULT 5,
  max_photos_per_listing INTEGER NOT NULL DEFAULT 5,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
  features JSONB DEFAULT '{}',
  price_monthly INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Create verification requests
CREATE TABLE IF NOT EXISTS public.c2c_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.c2c_sellers(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_c2c_transactions_workspace ON public.c2c_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_c2c_transactions_status ON public.c2c_transactions(status);
CREATE INDEX IF NOT EXISTS idx_c2c_disputes_workspace ON public.c2c_disputes(workspace_id);

-- RLS
ALTER TABLE public.c2c_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c2c_escrow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c2c_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c2c_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c2c_seller_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c2c_verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members manage transactions" ON public.c2c_transactions FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members manage escrow" ON public.c2c_escrow FOR ALL TO authenticated
  USING (transaction_id IN (SELECT id FROM public.c2c_transactions WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())))
  WITH CHECK (transaction_id IN (SELECT id FROM public.c2c_transactions WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "Workspace members manage disputes" ON public.c2c_disputes FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members manage moderation" ON public.c2c_moderation_queue FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can read seller tiers" ON public.c2c_seller_tiers FOR SELECT USING (true);

CREATE POLICY "Workspace members manage verification" ON public.c2c_verification_requests FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
