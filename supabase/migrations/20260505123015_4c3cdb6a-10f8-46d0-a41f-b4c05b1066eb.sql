
-- 1) dm_start: bypass para super admin
CREATE OR REPLACE FUNCTION public.dm_start(_other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _ws uuid;
  _conv uuid;
  _is_sa boolean;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _me = _other_user THEN RAISE EXCEPTION 'cannot DM yourself'; END IF;

  _is_sa := public.is_super_admin(_me);

  -- Tentar workspace partilhado primeiro
  SELECT wa.workspace_id INTO _ws
  FROM public.workspace_members wa
  JOIN public.workspace_members wb ON wa.workspace_id = wb.workspace_id
  WHERE wa.user_id = _me AND wb.user_id = _other_user
  LIMIT 1;

  -- Se não partilham e o chamador é super admin, usar workspace do outro utilizador
  IF _ws IS NULL AND _is_sa THEN
    SELECT workspace_id INTO _ws
    FROM public.workspace_members
    WHERE user_id = _other_user
    ORDER BY created_at ASC NULLS LAST
    LIMIT 1;

    -- Fallback: se o outro também não tem workspace, usar o do super admin
    IF _ws IS NULL THEN
      SELECT workspace_id INTO _ws
      FROM public.workspace_members
      WHERE user_id = _me
      ORDER BY created_at ASC NULLS LAST
      LIMIT 1;
    END IF;
  END IF;

  IF _ws IS NULL THEN RAISE EXCEPTION 'users do not share a workspace'; END IF;

  -- Conversa existente
  SELECT c.id INTO _conv
  FROM public.dm_conversations c
  WHERE c.conv_type = 'dm'
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
END; $function$;

-- 2) Listar todos os utilizadores (apenas super admin)
CREATE OR REPLACE FUNCTION public.dm_list_all_users()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  workspaces text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: super admin only';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    COALESCE(
      (SELECT string_agg(w.name, ', ' ORDER BY w.name)
       FROM public.workspace_members wm
       JOIN public.workspaces w ON w.id = wm.workspace_id
       WHERE wm.user_id = p.user_id),
      ''
    ) AS workspaces
  FROM public.profiles p
  WHERE p.user_id IS NOT NULL
    AND p.user_id <> auth.uid()
  ORDER BY p.full_name NULLS LAST, p.email;
END; $function$;

GRANT EXECUTE ON FUNCTION public.dm_list_all_users() TO authenticated;
