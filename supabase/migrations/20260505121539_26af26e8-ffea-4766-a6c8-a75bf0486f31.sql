
-- ============================================================
-- DIRECT MESSAGING SYSTEM (prefixed dm_ to avoid CRM collision)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.dm_conversation_type AS ENUM ('dm', 'group', 'broadcast');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conv_type public.dm_conversation_type NOT NULL DEFAULT 'dm',
  title text,
  created_by uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_broadcast_no_workspace CHECK (
    (conv_type = 'broadcast' AND workspace_id IS NULL) OR
    (conv_type IN ('dm','group') AND workspace_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_dm_conv_workspace ON public.dm_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dm_conv_last_msg ON public.dm_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.dm_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  member_role text NOT NULL DEFAULT 'member' CHECK (member_role IN ('member','admin')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  muted boolean NOT NULL DEFAULT false,
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_members_user ON public.dm_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_members_conv ON public.dm_members(conversation_id);

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_conv_created ON public.dm_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender ON public.dm_messages(sender_id);

CREATE TABLE IF NOT EXISTS public.dm_receipts (
  message_id uuid NOT NULL REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online','away','offline')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- HELPERS
CREATE OR REPLACE FUNCTION public.dm_is_member(_conv_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.dm_members WHERE conversation_id = _conv_id AND user_id = _user_id);
$$;

-- RLS
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_conv_select" ON public.dm_conversations FOR SELECT
  USING (public.dm_is_member(id, auth.uid()) OR (conv_type = 'broadcast' AND auth.uid() IS NOT NULL));

CREATE POLICY "dm_conv_no_direct_insert" ON public.dm_conversations FOR INSERT WITH CHECK (false);
CREATE POLICY "dm_conv_creator_update" ON public.dm_conversations FOR UPDATE
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "dm_members_select" ON public.dm_members FOR SELECT
  USING (user_id = auth.uid() OR public.dm_is_member(conversation_id, auth.uid()));
CREATE POLICY "dm_members_self_update" ON public.dm_members FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "dm_members_no_direct_insert" ON public.dm_members FOR INSERT WITH CHECK (false);
CREATE POLICY "dm_members_self_delete" ON public.dm_members FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "dm_messages_select" ON public.dm_messages FOR SELECT
  USING (
    public.dm_is_member(conversation_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.dm_conversations c WHERE c.id = conversation_id AND c.conv_type = 'broadcast')
  );

CREATE POLICY "dm_messages_insert" ON public.dm_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.dm_is_member(conversation_id, auth.uid())
      OR (
        EXISTS (SELECT 1 FROM public.dm_conversations c WHERE c.id = conversation_id AND c.conv_type = 'broadcast')
        AND public.is_super_admin(auth.uid())
      )
    )
  );

CREATE POLICY "dm_messages_update_own" ON public.dm_messages FOR UPDATE
  USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
CREATE POLICY "dm_messages_delete_own" ON public.dm_messages FOR DELETE USING (sender_id = auth.uid());

CREATE POLICY "dm_receipts_self" ON public.dm_receipts FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "presence_select_authed" ON public.user_presence FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "presence_self_all" ON public.user_presence FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- TRIGGER bump last_message_at
CREATE OR REPLACE FUNCTION public.dm_bump_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.dm_conversations
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_dm_bump_last ON public.dm_messages;
CREATE TRIGGER trg_dm_bump_last AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.dm_bump_last_message();

-- RPC: start_dm
CREATE OR REPLACE FUNCTION public.dm_start(_other_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _ws uuid;
  _conv uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _me = _other_user THEN RAISE EXCEPTION 'cannot DM yourself'; END IF;

  SELECT wa.workspace_id INTO _ws
  FROM public.workspace_members wa
  JOIN public.workspace_members wb ON wa.workspace_id = wb.workspace_id
  WHERE wa.user_id = _me AND wb.user_id = _other_user
  LIMIT 1;

  IF _ws IS NULL THEN RAISE EXCEPTION 'users do not share a workspace'; END IF;

  SELECT c.id INTO _conv
  FROM public.dm_conversations c
  WHERE c.conv_type = 'dm' AND c.workspace_id = _ws
    AND EXISTS (SELECT 1 FROM public.dm_members m WHERE m.conversation_id = c.id AND m.user_id = _me)
    AND EXISTS (SELECT 1 FROM public.dm_members m WHERE m.conversation_id = c.id AND m.user_id = _other_user)
    AND (SELECT count(*) FROM public.dm_members m WHERE m.conversation_id = c.id) = 2
  LIMIT 1;

  IF _conv IS NOT NULL THEN RETURN _conv; END IF;

  INSERT INTO public.dm_conversations (workspace_id, conv_type, created_by)
  VALUES (_ws, 'dm', _me) RETURNING id INTO _conv;

  INSERT INTO public.dm_members (conversation_id, user_id, member_role)
  VALUES (_conv, _me, 'admin'), (_conv, _other_user, 'member');

  RETURN _conv;
END; $$;

-- RPC: create_group
CREATE OR REPLACE FUNCTION public.dm_create_group(_workspace_id uuid, _title text, _member_ids uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _conv uuid;
  _uid uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _title IS NULL OR length(trim(_title)) < 2 THEN RAISE EXCEPTION 'title required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _me) THEN
    RAISE EXCEPTION 'not a workspace member';
  END IF;

  INSERT INTO public.dm_conversations (workspace_id, conv_type, title, created_by)
  VALUES (_workspace_id, 'group', _title, _me) RETURNING id INTO _conv;

  INSERT INTO public.dm_members (conversation_id, user_id, member_role) VALUES (_conv, _me, 'admin');

  IF _member_ids IS NOT NULL THEN
    FOREACH _uid IN ARRAY _member_ids LOOP
      IF _uid <> _me AND EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _uid) THEN
        INSERT INTO public.dm_members (conversation_id, user_id, member_role)
        VALUES (_conv, _uid, 'member') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN _conv;
END; $$;

-- RPC: broadcast (super admin only)
CREATE OR REPLACE FUNCTION public.dm_create_broadcast(_title text, _body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _conv uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.is_super_admin(_me) THEN RAISE EXCEPTION 'only super admin'; END IF;
  IF _body IS NULL OR length(trim(_body)) < 1 THEN RAISE EXCEPTION 'body required'; END IF;

  INSERT INTO public.dm_conversations (workspace_id, conv_type, title, created_by)
  VALUES (NULL, 'broadcast', COALESCE(NULLIF(trim(_title),''), 'Anúncio'), _me)
  RETURNING id INTO _conv;

  INSERT INTO public.dm_members (conversation_id, user_id, member_role)
  SELECT DISTINCT _conv, wm.user_id, CASE WHEN wm.user_id = _me THEN 'admin' ELSE 'member' END
  FROM public.workspace_members wm ON CONFLICT DO NOTHING;

  INSERT INTO public.dm_messages (conversation_id, sender_id, body) VALUES (_conv, _me, _body);

  RETURN _conv;
END; $$;

-- RPC: mark read
CREATE OR REPLACE FUNCTION public.dm_mark_read(_conv_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.dm_members SET last_read_at = now()
  WHERE conversation_id = _conv_id AND user_id = auth.uid();
$$;

-- RPC: unread count
CREATE OR REPLACE FUNCTION public.dm_unread_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(c)::int, 0) FROM (
    SELECT count(*) AS c
    FROM public.dm_messages m
    JOIN public.dm_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = auth.uid()
    WHERE m.created_at > cm.last_read_at
      AND m.sender_id <> auth.uid()
      AND m.deleted_at IS NULL
    GROUP BY m.conversation_id
  ) sub;
$$;

-- RPC: add member to group (admin)
CREATE OR REPLACE FUNCTION public.dm_add_member(_conv_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _ws uuid;
  _type dm_conversation_type;
BEGIN
  SELECT workspace_id, conv_type INTO _ws, _type FROM public.dm_conversations WHERE id = _conv_id;
  IF _type <> 'group' THEN RAISE EXCEPTION 'only groups'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dm_members WHERE conversation_id = _conv_id AND user_id = _me AND member_role = 'admin') THEN
    RAISE EXCEPTION 'not a conversation admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _ws AND user_id = _user_id) THEN
    RAISE EXCEPTION 'user not in workspace';
  END IF;
  INSERT INTO public.dm_members (conversation_id, user_id) VALUES (_conv_id, _user_id) ON CONFLICT DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.dm_leave(_conv_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.dm_members WHERE conversation_id = _conv_id AND user_id = auth.uid();
$$;

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_members;

ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;
ALTER TABLE public.dm_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.dm_members REPLICA IDENTITY FULL;
