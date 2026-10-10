CREATE OR REPLACE FUNCTION public.forum_is_moderator(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspace_members wm
               WHERE wm.workspace_id = _workspace_id AND wm.user_id = auth.uid()
                 AND wm.role IN ('owner'::workspace_role,'admin'::workspace_role)))
$$;

CREATE OR REPLACE FUNCTION public.forum_can_read_category(_workspace_id uuid, _category_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cat record;
  v_cs record;
  v_tier text;
BEGIN
  IF _workspace_id IS NULL THEN RETURN false; END IF;
  IF _category_id IS NOT NULL THEN
    SELECT workspace_id, is_active, is_private, is_paid INTO v_cat
    FROM public.forum_categories WHERE id = _category_id;
    IF NOT FOUND OR v_cat.workspace_id <> _workspace_id THEN RETURN false; END IF;
  END IF;

  -- Workspace members and super admins: full access to their workspace forum
  IF auth.uid() IS NOT NULL AND (public.is_super_admin(auth.uid())
      OR public.is_workspace_member(auth.uid(), _workspace_id)) THEN
    RETURN true;
  END IF;

  IF _category_id IS NOT NULL AND NOT coalesce(v_cat.is_active, false) THEN RETURN false; END IF;

  -- Active community members
  IF auth.uid() IS NOT NULL THEN
    SELECT membership_tier INTO v_tier FROM public.community_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid() AND status = 'active'
    ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN
      IF _category_id IS NOT NULL AND coalesce(v_cat.is_paid, false) THEN
        RETURN v_tier = 'premium';
      END IF;
      RETURN true;
    END IF;
  END IF;

  -- Visitors: only public, free categories in a public, discoverable community
  SELECT is_private, is_discoverable INTO v_cs FROM public.community_settings
  WHERE workspace_id = _workspace_id ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND OR coalesce(v_cs.is_private, true) OR NOT coalesce(v_cs.is_discoverable, false) THEN
    RETURN false;
  END IF;
  IF _category_id IS NOT NULL AND (coalesce(v_cat.is_private, true) OR coalesce(v_cat.is_paid, true)) THEN
    RETURN false;
  END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.forum_can_read_topic(_topic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.forum_topics t
    WHERE t.id = _topic_id
      AND public.forum_can_read_category(t.workspace_id, t.category_id)
      AND (t.moderation_status = 'approved'
           OR (auth.uid() IS NOT NULL AND t.author_id = auth.uid())
           OR public.forum_is_moderator(t.workspace_id)))
$$;

CREATE OR REPLACE FUNCTION public.forum_can_read_post(_post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.forum_posts p
    JOIN public.forum_topics t ON t.id = p.topic_id AND t.workspace_id = p.workspace_id
    WHERE p.id = _post_id
      AND public.forum_can_read_topic(t.id)
      AND (p.moderation_status = 'approved'
           OR (auth.uid() IS NOT NULL AND p.author_id = auth.uid())
           OR public.forum_is_moderator(p.workspace_id)))
$$;

REVOKE ALL ON FUNCTION public.forum_is_moderator(uuid), public.forum_can_read_category(uuid, uuid),
  public.forum_can_read_topic(uuid), public.forum_can_read_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forum_is_moderator(uuid), public.forum_can_read_category(uuid, uuid),
  public.forum_can_read_topic(uuid), public.forum_can_read_post(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS forum_categories_public_read ON public.forum_categories;
CREATE POLICY forum_categories_selective_read ON public.forum_categories FOR SELECT TO anon, authenticated
  USING (public.forum_can_read_category(workspace_id, id));

DROP POLICY IF EXISTS forum_topics_public_read ON public.forum_topics;
CREATE POLICY forum_topics_selective_read ON public.forum_topics FOR SELECT TO anon, authenticated
  USING (public.forum_can_read_topic(id));

DROP POLICY IF EXISTS forum_posts_public_read ON public.forum_posts;
CREATE POLICY forum_posts_selective_read ON public.forum_posts FOR SELECT TO anon, authenticated
  USING (public.forum_can_read_post(id));

DROP POLICY IF EXISTS forum_reactions_public_read ON public.forum_reactions;
CREATE POLICY forum_reactions_selective_read ON public.forum_reactions FOR SELECT TO anon, authenticated
  USING (
    (post_id IS NOT NULL AND public.forum_can_read_post(post_id))
    OR (post_id IS NULL AND topic_id IS NOT NULL AND public.forum_can_read_topic(topic_id))
  );

-- Live chat: only sessions currently live; seller/authors/workspace admins keep access
DROP POLICY IF EXISTS live_chat_messages_select_published ON public.live_chat_messages;
CREATE POLICY live_chat_messages_select_live ON public.live_chat_messages FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = live_chat_messages.live_session_id AND s.status = 'live')
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = live_chat_messages.live_session_id
               AND auth.uid() IS NOT NULL
               AND (s.seller_id = auth.uid() OR public.forum_is_moderator(s.workspace_id)))
  );