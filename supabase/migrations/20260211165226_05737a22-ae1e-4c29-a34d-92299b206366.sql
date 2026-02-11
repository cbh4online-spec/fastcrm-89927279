
CREATE TABLE public.c2c_seller_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  message TEXT,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.c2c_seller_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage seller invites"
  ON public.c2c_seller_invites FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read invite by token"
  ON public.c2c_seller_invites FOR SELECT
  TO anon, authenticated
  USING (true);
