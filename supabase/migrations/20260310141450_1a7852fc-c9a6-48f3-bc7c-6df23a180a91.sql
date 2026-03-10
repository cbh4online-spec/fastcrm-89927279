
-- C2C Loyalty Points table
CREATE TABLE public.c2c_loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Loyalty transactions log
CREATE TABLE public.c2c_loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_c2c_loyalty_points_user ON public.c2c_loyalty_points(workspace_id, user_id);
CREATE INDEX idx_c2c_loyalty_transactions_user ON public.c2c_loyalty_transactions(workspace_id, user_id);

-- RLS
ALTER TABLE public.c2c_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c2c_loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty points"
  ON public.c2c_loyalty_points FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own loyalty transactions"
  ON public.c2c_loyalty_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.c2c_notifications;
