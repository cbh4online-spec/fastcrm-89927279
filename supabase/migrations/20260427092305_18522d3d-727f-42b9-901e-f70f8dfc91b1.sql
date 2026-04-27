-- Publications: snapshot histórico de cada publicação (permite rollback auditável)
CREATE TABLE public.builder_publications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.builder_assets(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  version_id UUID REFERENCES public.builder_asset_versions(id) ON DELETE SET NULL,
  publication_number INTEGER NOT NULL,
  html TEXT NOT NULL,
  notes TEXT,
  is_rollback BOOLEAN NOT NULL DEFAULT false,
  rolled_back_from UUID REFERENCES public.builder_publications(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  published_by UUID NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unpublished_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX builder_publications_number_per_asset
  ON public.builder_publications (asset_id, publication_number);

CREATE INDEX idx_builder_publications_asset_active
  ON public.builder_publications (asset_id) WHERE is_active = true;

CREATE INDEX idx_builder_publications_workspace
  ON public.builder_publications (workspace_id);

ALTER TABLE public.builder_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_publications_select"
  ON public.builder_publications FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "builder_publications_insert"
  ON public.builder_publications FOR INSERT
  WITH CHECK (
    is_workspace_member(auth.uid(), workspace_id)
    AND published_by = auth.uid()
  );

CREATE POLICY "builder_publications_update"
  ON public.builder_publications FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- Domínios: mapeamento (host[/path]) -> asset publicado
CREATE TABLE public.builder_asset_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.builder_assets(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  hostname TEXT NOT NULL,
  path_prefix TEXT NOT NULL DEFAULT '/',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT builder_asset_domains_hostname_check CHECK (
    char_length(hostname) BETWEEN 3 AND 253
    AND hostname ~ '^[a-z0-9.-]+$'
  ),
  CONSTRAINT builder_asset_domains_path_check CHECK (
    char_length(path_prefix) BETWEEN 1 AND 120
    AND path_prefix ~ '^/[a-z0-9/_-]*$'
  )
);

CREATE UNIQUE INDEX builder_asset_domains_unique_host_path
  ON public.builder_asset_domains (lower(hostname), path_prefix);

CREATE INDEX idx_builder_asset_domains_asset
  ON public.builder_asset_domains (asset_id);

ALTER TABLE public.builder_asset_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_asset_domains_select"
  ON public.builder_asset_domains FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "builder_asset_domains_insert"
  ON public.builder_asset_domains FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "builder_asset_domains_update"
  ON public.builder_asset_domains FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "builder_asset_domains_delete"
  ON public.builder_asset_domains FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE TRIGGER builder_asset_domains_set_updated_at
  BEFORE UPDATE ON public.builder_asset_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função RPC: publicar asset (cria nova publicação, desativa anteriores)
CREATE OR REPLACE FUNCTION public.publish_builder_asset(
  _asset_id UUID,
  _html TEXT,
  _version_id UUID DEFAULT NULL,
  _notes TEXT DEFAULT NULL,
  _is_rollback BOOLEAN DEFAULT false,
  _rolled_back_from UUID DEFAULT NULL
)
RETURNS public.builder_publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _workspace UUID;
  _next_num INTEGER;
  _row public.builder_publications;
BEGIN
  SELECT workspace_id INTO _workspace
  FROM public.builder_assets WHERE id = _asset_id AND deleted_at IS NULL;

  IF _workspace IS NULL THEN
    RAISE EXCEPTION 'Asset não encontrado';
  END IF;

  IF NOT (is_workspace_member(auth.uid(), _workspace) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão para publicar neste workspace';
  END IF;

  -- Desativa publicações anteriores
  UPDATE public.builder_publications
  SET is_active = false, unpublished_at = now()
  WHERE asset_id = _asset_id AND is_active = true;

  SELECT COALESCE(MAX(publication_number), 0) + 1 INTO _next_num
  FROM public.builder_publications WHERE asset_id = _asset_id;

  INSERT INTO public.builder_publications (
    asset_id, workspace_id, version_id, publication_number,
    html, notes, is_rollback, rolled_back_from,
    is_active, published_by
  ) VALUES (
    _asset_id, _workspace, _version_id, _next_num,
    _html, _notes, _is_rollback, _rolled_back_from,
    true, auth.uid()
  )
  RETURNING * INTO _row;

  -- Marca asset como published
  UPDATE public.builder_assets
  SET status = 'published', updated_at = now()
  WHERE id = _asset_id;

  RETURN _row;
END;
$$;

-- Função pública (sem auth) usada pela edge function builder-serve
CREATE OR REPLACE FUNCTION public.get_published_builder_asset(
  _hostname TEXT DEFAULT NULL,
  _path TEXT DEFAULT NULL,
  _slug TEXT DEFAULT NULL,
  _workspace UUID DEFAULT NULL
)
RETURNS TABLE (
  asset_id UUID,
  name TEXT,
  html TEXT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH resolved AS (
    SELECT a.id, a.name
    FROM public.builder_assets a
    WHERE a.deleted_at IS NULL
      AND a.status = 'published'
      AND (
        (_slug IS NOT NULL AND _workspace IS NOT NULL
         AND a.slug = _slug AND a.workspace_id = _workspace)
        OR EXISTS (
          SELECT 1 FROM public.builder_asset_domains d
          WHERE d.asset_id = a.id
            AND d.verified = true
            AND _hostname IS NOT NULL
            AND lower(d.hostname) = lower(_hostname)
            AND (_path IS NULL OR _path LIKE d.path_prefix || '%')
        )
      )
    LIMIT 1
  )
  SELECT r.id, r.name, p.html, p.published_at
  FROM resolved r
  JOIN public.builder_publications p
    ON p.asset_id = r.id AND p.is_active = true
  LIMIT 1;
$$;