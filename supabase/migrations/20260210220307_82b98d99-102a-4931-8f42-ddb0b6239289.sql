
CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invite_token uuid DEFAULT gen_random_uuid(),
  invite_expires_at timestamptz DEFAULT (now() + interval '7 days'),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Workspace members can read
CREATE POLICY "Workspace members can read community members"
  ON public.community_members FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace admins can manage
CREATE POLICY "Workspace admins can manage community members"
  ON public.community_members FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Anon can read by invite_token for activation
CREATE POLICY "Anyone can read invite by token"
  ON public.community_members FOR SELECT
  TO anon
  USING (invite_token IS NOT NULL);

-- Unique constraint
ALTER TABLE public.community_members
  ADD CONSTRAINT community_members_workspace_email_unique
  UNIQUE (workspace_id, email);
