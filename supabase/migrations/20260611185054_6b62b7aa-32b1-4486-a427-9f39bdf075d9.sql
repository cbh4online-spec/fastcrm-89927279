
-- 1. Visibility column
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'workspace'
  CHECK (visibility IN ('private','shared','workspace'));

CREATE INDEX IF NOT EXISTS idx_conversations_workspace_visibility
  ON public.conversations(workspace_id, visibility);

-- Backfill: email conversations default to private
UPDATE public.conversations SET visibility = 'private'
WHERE channel = 'email' AND visibility = 'workspace';

-- 2. Sharing table
CREATE TABLE IF NOT EXISTS public.conversation_shared_with (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_shared_with TO authenticated;
GRANT ALL ON public.conversation_shared_with TO service_role;

ALTER TABLE public.conversation_shared_with ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_conv_shared_user ON public.conversation_shared_with(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_shared_conv ON public.conversation_shared_with(conversation_id);

-- 3. Access helper
CREATE OR REPLACE FUNCTION public.can_access_conversation(_conv_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_visibility text;
  v_assigned_to uuid;
  v_connection_id uuid;
  v_connection_owner uuid;
BEGIN
  IF _user_id IS NULL OR _conv_id IS NULL THEN
    RETURN false;
  END IF;

  -- Super admin bypass
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  SELECT workspace_id, visibility, assigned_to,
         NULLIF(channel_metadata->>'connection_id','')::uuid
    INTO v_workspace_id, v_visibility, v_assigned_to, v_connection_id
  FROM public.conversations
  WHERE id = _conv_id;

  IF v_workspace_id IS NULL THEN
    RETURN false;
  END IF;

  -- Must at least belong to the workspace
  IF NOT public.is_workspace_member(_user_id, v_workspace_id) THEN
    RETURN false;
  END IF;

  -- Workspace admins/owners always see
  IF public.is_workspace_admin_or_owner(_user_id, v_workspace_id) THEN
    RETURN true;
  END IF;

  -- Public-in-workspace conversations
  IF v_visibility = 'workspace' THEN
    RETURN true;
  END IF;

  -- Assigned agent
  IF v_assigned_to IS NOT NULL AND v_assigned_to = _user_id THEN
    RETURN true;
  END IF;

  -- Connection owner (mailbox owner)
  IF v_connection_id IS NOT NULL THEN
    SELECT connected_by INTO v_connection_owner
    FROM public.email_connections WHERE id = v_connection_id;
    IF v_connection_owner = _user_id THEN
      RETURN true;
    END IF;
  END IF;

  -- Explicitly shared
  IF EXISTS (
    SELECT 1 FROM public.conversation_shared_with
    WHERE conversation_id = _conv_id AND user_id = _user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_conversation(uuid, uuid) TO authenticated, service_role;

-- 4. Helper: can manage privacy of conversation (owner of connection OR ws admin/owner OR super_admin OR assigned)
CREATE OR REPLACE FUNCTION public.can_manage_conversation_privacy(_conv_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_assigned_to uuid;
  v_connection_owner uuid;
BEGIN
  IF _user_id IS NULL OR _conv_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  SELECT c.workspace_id, c.assigned_to, ec.connected_by
    INTO v_workspace_id, v_assigned_to, v_connection_owner
  FROM public.conversations c
  LEFT JOIN public.email_connections ec
    ON ec.id = NULLIF(c.channel_metadata->>'connection_id','')::uuid
  WHERE c.id = _conv_id;

  IF v_workspace_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_workspace_admin_or_owner(_user_id, v_workspace_id) THEN
    RETURN true;
  END IF;

  IF v_connection_owner = _user_id THEN
    RETURN true;
  END IF;

  IF v_assigned_to = _user_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_conversation_privacy(uuid, uuid) TO authenticated, service_role;

-- 5. Update RLS on conversations: replace SELECT/UPDATE member policies
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Members can update conversations" ON public.conversations;

CREATE POLICY "Members can view accessible conversations"
  ON public.conversations FOR SELECT
  USING (public.can_access_conversation(id, auth.uid()));

CREATE POLICY "Members can update accessible conversations"
  ON public.conversations FOR UPDATE
  USING (public.can_access_conversation(id, auth.uid()));

-- 6. Update RLS on messages
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Members can update messages" ON public.messages;

CREATE POLICY "Members can view accessible messages"
  ON public.messages FOR SELECT
  USING (public.can_access_conversation(conversation_id, auth.uid()));

CREATE POLICY "Members can update accessible messages"
  ON public.messages FOR UPDATE
  USING (public.can_access_conversation(conversation_id, auth.uid()));

-- 7. Policies on conversation_shared_with
CREATE POLICY "View shares of accessible conversations"
  ON public.conversation_shared_with FOR SELECT
  USING (public.can_access_conversation(conversation_id, auth.uid())
         OR user_id = auth.uid());

CREATE POLICY "Managers can grant shares"
  ON public.conversation_shared_with FOR INSERT
  WITH CHECK (public.can_manage_conversation_privacy(conversation_id, auth.uid()));

CREATE POLICY "Managers can revoke shares"
  ON public.conversation_shared_with FOR DELETE
  USING (public.can_manage_conversation_privacy(conversation_id, auth.uid()));
