CREATE OR REPLACE FUNCTION public.forum_is_internal_reader(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _workspace_id IS NOT NULL AND auth.uid() IS NOT NULL AND (
    public.is_super_admin(auth.uid()) OR public.is_workspace_member(auth.uid(), _workspace_id))
$$;

-- NULL category: readable only by workspace members / super admins (never visitors or external community members)
CREATE OR REPLACE FUNCTION public.forum_can_read_category(_workspace_id uuid, _category_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cat record;
  v_cs record;
  v_tier text;
BEGIN
  IF _workspace_id IS NULL THEN RETURN false; END IF;
  IF _category_id IS NULL THEN RETURN public.forum_is_internal_reader(_workspace_id); END IF;

  SELECT workspace_id, is_active, is_private, is_paid INTO v_cat
  FROM public.forum_categories WHERE id = _category_id;
  IF NOT FOUND OR v_cat.workspace_id IS DISTINCT FROM _workspace_id THEN RETURN false; END IF;

  IF public.forum_is_internal_reader(_workspace_id) THEN RETURN true; END IF;

  IF NOT coalesce(v_cat.is_active, false) THEN RETURN false; END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT membership_tier INTO v_tier FROM public.community_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid() AND status = 'active'
    ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN
      IF coalesce(v_cat.is_paid, false) THEN RETURN v_tier = 'premium'; END IF;
      RETURN true;
    END IF;
  END IF;

  SELECT is_private, is_discoverable INTO v_cs FROM public.community_settings
  WHERE workspace_id = _workspace_id ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND OR coalesce(v_cs.is_private, true) OR NOT coalesce(v_cs.is_discoverable, false) THEN
    RETURN false;
  END IF;
  IF coalesce(v_cat.is_private, true) OR coalesce(v_cat.is_paid, true) THEN RETURN false; END IF;
  RETURN true;
END $$;

-- Author and moderators keep access to their own/moderated topics; everyone else needs approved + readable category
CREATE OR REPLACE FUNCTION public.forum_can_read_topic(_topic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.forum_topics t
    WHERE t.id = _topic_id
      AND (
        public.forum_is_moderator(t.workspace_id)
        OR (auth.uid() IS NOT NULL AND t.author_id = auth.uid())
        OR (t.moderation_status = 'approved'
            AND public.forum_can_read_category(t.workspace_id, t.category_id))
      ))
$$;

CREATE OR REPLACE FUNCTION public.forum_can_read_reaction(_workspace_id uuid, _topic_id uuid, _post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _workspace_id IS NULL THEN false
    WHEN _post_id IS NOT NULL THEN EXISTS (
      SELECT 1 FROM public.forum_posts p
      JOIN public.forum_topics t ON t.id = p.topic_id AND t.workspace_id = p.workspace_id
      WHERE p.id = _post_id
        AND p.workspace_id = _workspace_id
        AND (_topic_id IS NULL OR _topic_id = p.topic_id)
        AND public.forum_can_read_post(p.id))
    WHEN _topic_id IS NOT NULL THEN EXISTS (
      SELECT 1 FROM public.forum_topics t
      WHERE t.id = _topic_id AND t.workspace_id = _workspace_id
        AND public.forum_can_read_topic(t.id))
    ELSE false
  END
$$;

REVOKE ALL ON FUNCTION public.forum_is_internal_reader(uuid), public.forum_can_read_reaction(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forum_is_internal_reader(uuid), public.forum_can_read_reaction(uuid, uuid, uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS forum_reactions_selective_read ON public.forum_reactions;
CREATE POLICY forum_reactions_selective_read ON public.forum_reactions FOR SELECT TO anon, authenticated
  USING (public.forum_can_read_reaction(workspace_id, topic_id, post_id));