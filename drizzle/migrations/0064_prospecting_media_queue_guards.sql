-- Media guard: lock keys FIRST on UPDATE, then validate profile and storage_path.
CREATE OR REPLACE FUNCTION public.prospecting_outreach_media_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
       OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
       OR NEW.step_index IS DISTINCT FROM OLD.step_index THEN
      RAISE EXCEPTION 'Não é permitido mudar o espaço de trabalho, perfil ou etapa do conteúdo' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.professional_prospecting_profiles p
    WHERE p.id = NEW.profile_id AND p.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'Perfil não pertence a este espaço de trabalho' USING ERRCODE = '42501';
  END IF;
  IF NEW.kind = 'video' THEN
    IF split_part(NEW.storage_path, '/', 1) <> NEW.workspace_id::text THEN
      RAISE EXCEPTION 'Ficheiro fora da pasta do espaço de trabalho' USING ERRCODE = '42501';
    END IF;
    -- A new or changed path must be a file uploaded by the current user in their own folder,
    -- so row A can never take over B's storage_path.
    IF TG_OP = 'INSERT' OR NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN
      IF auth.uid() IS NULL
         OR split_part(NEW.storage_path, '/', 2) <> auth.uid()::text
         OR NOT EXISTS (
           SELECT 1 FROM storage.objects o
           WHERE o.bucket_id = 'prospecting-videos' AND o.name = NEW.storage_path
             AND o.owner_id = auth.uid()::text
         ) THEN
        RAISE EXCEPTION 'Ficheiro de vídeo inválido para este utilizador' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prospecting_outreach_media_guard() FROM PUBLIC, anon, authenticated;

-- Queue guard: profile must belong to the same workspace on every write (no data changed, no UNIQUE).
CREATE OR REPLACE FUNCTION public.prospecting_outreach_queue_workspace_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.workspace_id IS NOT DISTINCT FROM OLD.workspace_id
     AND NEW.profile_id IS NOT DISTINCT FROM OLD.profile_id THEN
    RETURN NEW;
  END IF;
  IF NEW.profile_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.professional_prospecting_profiles p
    WHERE p.id = NEW.profile_id AND p.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'Perfil não pertence a este espaço de trabalho' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prospecting_outreach_queue_workspace_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS prospecting_outreach_queue_workspace_guard ON public.prospecting_outreach_queue;
CREATE TRIGGER prospecting_outreach_queue_workspace_guard
  BEFORE INSERT OR UPDATE ON public.prospecting_outreach_queue
  FOR EACH ROW EXECUTE FUNCTION public.prospecting_outreach_queue_workspace_guard();