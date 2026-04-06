-- Create abandoned_carts table
CREATE TABLE public.abandoned_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_id TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  cart_value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recovery_status TEXT NOT NULL DEFAULT 'pending',
  recovered_at TIMESTAMPTZ,
  recovery_channel TEXT,
  recovery_url TEXT,
  touch_1_at TIMESTAMPTZ,
  touch_2_at TIMESTAMPTZ,
  touch_3_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_abandoned_carts_workspace ON public.abandoned_carts(workspace_id);
CREATE INDEX idx_abandoned_carts_status ON public.abandoned_carts(recovery_status);
CREATE INDEX idx_abandoned_carts_detected ON public.abandoned_carts(detected_at DESC);
CREATE INDEX idx_abandoned_carts_session ON public.abandoned_carts(session_id);

-- Enable RLS
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- RLS policies — workspace members only
CREATE POLICY "Workspace members can view abandoned carts"
  ON public.abandoned_carts FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update abandoned carts"
  ON public.abandoned_carts FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- Service role insert (edge functions)
CREATE POLICY "Service role can insert abandoned carts"
  ON public.abandoned_carts FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update abandoned carts"
  ON public.abandoned_carts FOR UPDATE
  TO service_role
  USING (true);

-- Enable realtime for live dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.abandoned_carts;