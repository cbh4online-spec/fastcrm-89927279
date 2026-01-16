-- Create bundles table for marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  tagline text,
  icon text,
  module_ids uuid[] NOT NULL,
  original_price numeric NOT NULL,
  bundle_price numeric NOT NULL,
  discount_percent numeric GENERATED ALWAYS AS (ROUND((1 - bundle_price / NULLIF(original_price, 0)) * 100, 0)) STORED,
  currency text DEFAULT 'EUR',
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  target_audience text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_bundles ENABLE ROW LEVEL SECURITY;

-- Everyone can view active bundles
CREATE POLICY "Anyone can view active bundles"
  ON public.marketplace_bundles FOR SELECT
  USING (is_active = true);

-- Create workspace_bundles for tracking bundle purchases
CREATE TABLE IF NOT EXISTS public.workspace_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  bundle_id uuid REFERENCES public.marketplace_bundles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active',
  purchased_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, bundle_id)
);

-- Enable RLS
ALTER TABLE public.workspace_bundles ENABLE ROW LEVEL SECURITY;

-- Users can view their own bundles
CREATE POLICY "Users can view their own bundles"
  ON public.workspace_bundles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_bundles.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Users can insert their own bundles
CREATE POLICY "Users can insert their own bundles"
  ON public.workspace_bundles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_bundles.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_bundles_active ON public.marketplace_bundles(is_active);
CREATE INDEX idx_workspace_bundles_workspace ON public.workspace_bundles(workspace_id);
CREATE INDEX idx_workspace_bundles_bundle ON public.workspace_bundles(bundle_id);