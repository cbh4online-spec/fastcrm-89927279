
-- Add advanced coupon fields
ALTER TABLE public.store_coupons 
  ADD COLUMN IF NOT EXISTS single_use_per_customer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_ids text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_discount_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;

-- Track per-customer usage for single-use coupons
CREATE TABLE IF NOT EXISTS public.store_coupon_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id uuid NOT NULL REFERENCES public.store_coupons(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  order_id uuid DEFAULT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.store_coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read usage
CREATE POLICY "Workspace members can read coupon usage"
  ON public.store_coupon_usage
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- RLS: workspace members can insert usage
CREATE POLICY "Workspace members can insert coupon usage"
  ON public.store_coupon_usage
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Public can insert usage (for checkout without auth)
CREATE POLICY "Public can insert coupon usage on checkout"
  ON public.store_coupon_usage
  FOR INSERT
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_coupon_usage_lookup ON public.store_coupon_usage(coupon_id, customer_email);
CREATE INDEX IF NOT EXISTS idx_store_coupons_category ON public.store_coupons USING GIN(category_ids);
