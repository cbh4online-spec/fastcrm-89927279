
-- Create buyer status enum
CREATE TYPE public.c2c_buyer_status AS ENUM ('active', 'suspended');

-- Create buyers table
CREATE TABLE public.c2c_buyers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  shipping_address JSONB DEFAULT '{}'::jsonb,
  total_purchases INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  status public.c2c_buyer_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

-- Indexes
CREATE INDEX idx_c2c_buyers_workspace ON public.c2c_buyers(workspace_id);
CREATE INDEX idx_c2c_buyers_user ON public.c2c_buyers(user_id);
CREATE INDEX idx_c2c_buyers_status ON public.c2c_buyers(workspace_id, status);

-- Enable RLS
ALTER TABLE public.c2c_buyers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workspace members can view buyers"
  ON public.c2c_buyers FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can create own buyer profile"
  ON public.c2c_buyers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own buyer profile"
  ON public.c2c_buyers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete buyers"
  ON public.c2c_buyers FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_c2c_buyers_updated_at
  BEFORE UPDATE ON public.c2c_buyers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
