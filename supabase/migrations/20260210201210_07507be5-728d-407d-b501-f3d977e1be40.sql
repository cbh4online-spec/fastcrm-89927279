
-- Seller status enum
CREATE TYPE public.c2c_seller_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Sellers table
CREATE TABLE public.c2c_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  phone TEXT,
  location TEXT,
  -- Bank details for payouts
  iban TEXT,
  bank_name TEXT,
  account_holder TEXT,
  -- Tax info
  nif TEXT,
  -- Status
  status public.c2c_seller_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  -- Profile
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  total_sales INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  commission_rate NUMERIC(5,2) DEFAULT 5.00,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One seller per user per workspace
  UNIQUE(user_id, workspace_id)
);

-- Enable RLS
ALTER TABLE public.c2c_sellers ENABLE ROW LEVEL SECURITY;

-- Sellers can read their own record
CREATE POLICY "Users can view own seller profile"
ON public.c2c_sellers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Workspace members (admins) can view all sellers in their workspace
CREATE POLICY "Workspace members can view sellers"
ON public.c2c_sellers FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- Public can see approved sellers (for public marketplace)
CREATE POLICY "Public can view approved sellers"
ON public.c2c_sellers FOR SELECT
TO anon
USING (status = 'approved');

-- Authenticated users can also see approved sellers
CREATE POLICY "Authenticated can view approved sellers"
ON public.c2c_sellers FOR SELECT
TO authenticated
USING (status = 'approved');

-- Users can insert their own seller application
CREATE POLICY "Users can create seller application"
ON public.c2c_sellers FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own profile (but not status)
CREATE POLICY "Users can update own seller profile"
ON public.c2c_sellers FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Workspace admins can update sellers (for approval/rejection)
CREATE POLICY "Workspace admins can update sellers"
ON public.c2c_sellers FOR UPDATE
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_c2c_sellers_updated_at
BEFORE UPDATE ON public.c2c_sellers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Commissions tracking table
CREATE TABLE public.c2c_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.c2c_sellers(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.c2c_listings(id),
  buyer_id UUID REFERENCES auth.users(id),
  -- Financial
  sale_amount NUMERIC(12,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  commission_amount NUMERIC(12,2) NOT NULL,
  seller_amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.c2c_commissions ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own commissions
CREATE POLICY "Sellers can view own commissions"
ON public.c2c_commissions FOR SELECT
TO authenticated
USING (
  seller_id IN (SELECT id FROM public.c2c_sellers WHERE user_id = auth.uid())
);

-- Workspace admins can view all commissions
CREATE POLICY "Workspace admins can view commissions"
ON public.c2c_commissions FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Workspace admins can update commissions (mark as paid)
CREATE POLICY "Workspace admins can update commissions"
ON public.c2c_commissions FOR UPDATE
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Insert policy for system (via edge functions)
CREATE POLICY "System can insert commissions"
ON public.c2c_commissions FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);
