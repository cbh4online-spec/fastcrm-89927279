CREATE TABLE public.prospecting_outreach_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.professional_prospecting_profiles(id) ON DELETE CASCADE,
  step_index smallint NOT NULL CHECK (step_index BETWEEN 1 AND 3),
  kind text NOT NULL CHECK (kind IN ('url','video')),
  url text NOT NULL CHECK (length(url) <= 2048 AND url ~* '^https://[^/\s]+'),
  label text CHECK (label IS NULL OR length(label) <= 200),
  storage_path text CHECK (storage_path IS NULL OR length(storage_path) <= 300),
  mime_type text CHECK (mime_type IS NULL OR mime_type = 'video/mp4'),
  size_bytes integer CHECK (size_bytes IS NULL OR (size_bytes > 0 AND size_bytes <= 16777216)),
  url_expires_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospecting_outreach_media_video_fields CHECK (
    (kind = 'video' AND storage_path IS NOT NULL AND mime_type = 'video/mp4')
    OR (kind = 'url' AND storage_path IS NULL)
  ),
  CONSTRAINT prospecting_outreach_media_unique UNIQUE (workspace_id, profile_id, step_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_outreach_media TO authenticated;
GRANT ALL ON public.prospecting_outreach_media TO service_role;
ALTER TABLE public.prospecting_outreach_media ENABLE ROW LEVEL SECURITY;

-- Media must belong to a profile of the same workspace; video paths must sit in that workspace's folder.
CREATE OR REPLACE FUNCTION public.prospecting_outreach_media_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.professional_prospecting_profiles p
    WHERE p.id = NEW.profile_id AND p.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'Perfil não pertence a este espaço de trabalho' USING ERRCODE = '42501';
  END IF;
  IF NEW.kind = 'video' AND split_part(NEW.storage_path, '/', 1) <> NEW.workspace_id::text THEN
    RAISE EXCEPTION 'Ficheiro fora da pasta do espaço de trabalho' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.workspace_id := OLD.workspace_id;
    NEW.profile_id := OLD.profile_id;
    NEW.step_index := OLD.step_index;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER prospecting_outreach_media_guard
  BEFORE INSERT OR UPDATE ON public.prospecting_outreach_media
  FOR EACH ROW EXECUTE FUNCTION public.prospecting_outreach_media_guard();

CREATE POLICY prospecting_outreach_media_select ON public.prospecting_outreach_media
  FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY prospecting_outreach_media_insert ON public.prospecting_outreach_media
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY prospecting_outreach_media_update ON public.prospecting_outreach_media
  FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY prospecting_outreach_media_delete ON public.prospecting_outreach_media
  FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Exact text (message + link) recorded when the user confirms "Já enviei".
ALTER TABLE public.prospecting_outreach_queue ADD COLUMN IF NOT EXISTS sent_message text;
ALTER TABLE public.prospecting_outreach_queue ADD COLUMN IF NOT EXISTS sent_media_url text;
ALTER TABLE public.prospecting_outreach_queue ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Atomic confirmation: the queue advances first (ready -> sent) and the
-- profile step only moves in the same transaction.
CREATE OR REPLACE FUNCTION public.prospecting_mark_outreach_sent(
  p_queue_id uuid, p_sent_message text, p_media_url text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sem sessão' USING ERRCODE = '42501'; END IF;
  IF p_sent_message IS NULL OR length(btrim(p_sent_message)) = 0 OR length(p_sent_message) > 8000 THEN
    RAISE EXCEPTION 'Mensagem inválida';
  END IF;
  IF p_media_url IS NOT NULL AND (length(p_media_url) > 2048 OR p_media_url !~* '^https://[^/\s]+') THEN
    RAISE EXCEPTION 'Ligação inválida';
  END IF;
  SELECT q.id, q.workspace_id, q.profile_id, q.step_index INTO v_row
    FROM public.prospecting_outreach_queue q WHERE q.id = p_queue_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_workspace_member(auth.uid(), v_row.workspace_id) THEN
    RAISE EXCEPTION 'Follow-up não encontrado' USING ERRCODE = '42501';
  END IF;
  UPDATE public.prospecting_outreach_queue
    SET status = 'sent', sent_message = p_sent_message, sent_media_url = p_media_url,
        sent_at = now(), updated_at = now()
    WHERE id = p_queue_id AND status = 'ready';
  IF NOT FOUND THEN RAISE EXCEPTION 'Este follow-up já não está pronto para envio.'; END IF;
  UPDATE public.professional_prospecting_profiles
    SET outreach_step = v_row.step_index
    WHERE id = v_row.profile_id AND workspace_id = v_row.workspace_id
      AND (outreach_step IS NULL OR outreach_step < v_row.step_index);
  RETURN jsonb_build_object('queue_id', p_queue_id, 'profile_id', v_row.profile_id, 'step_index', v_row.step_index);
END;
$$;
REVOKE ALL ON FUNCTION public.prospecting_mark_outreach_sent(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prospecting_mark_outreach_sent(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.prospecting_outreach_media_guard() FROM PUBLIC, anon, authenticated;

-- Storage: private bucket, path = workspaceId/userId/<random>.mp4.
CREATE POLICY "prospecting_videos_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'prospecting-videos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND array_length(storage.foldername(name), 1) = 2
    AND lower(storage.extension(name)) = 'mp4'
    AND coalesce(metadata->>'mimetype', 'video/mp4') = 'video/mp4'
  );
CREATE POLICY "prospecting_videos_select_member" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'prospecting-videos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "prospecting_videos_delete_owner" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'prospecting-videos'
    AND owner_id = auth.uid()::text
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
    AND (storage.foldername(name))[2] = auth.uid()::text
  );