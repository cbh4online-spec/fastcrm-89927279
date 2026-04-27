-- Tabela de eventos
CREATE TABLE IF NOT EXISTS public.builder_page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  publication_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('view','click','form_submit','custom')),
  slug text,
  hostname text,
  path text,
  referrer text,
  user_agent text,
  country text,
  session_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bpe_asset_date ON public.builder_page_events(asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bpe_ws_date ON public.builder_page_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bpe_session ON public.builder_page_events(session_id);

ALTER TABLE public.builder_page_events ENABLE ROW LEVEL SECURITY;

-- Só membros do workspace podem ler
CREATE POLICY "Workspace members read builder events"
ON public.builder_page_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = builder_page_events.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Inserts apenas via service_role (edge function) ou RPC
CREATE POLICY "Service role inserts builder events"
ON public.builder_page_events FOR INSERT
TO service_role
WITH CHECK (true);

-- RPC pública para tracking (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.track_builder_event(
  _asset_id uuid,
  _event_type text,
  _slug text DEFAULT NULL,
  _hostname text DEFAULT NULL,
  _path text DEFAULT NULL,
  _referrer text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _session_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
  v_pub_id uuid;
  v_event_id uuid;
BEGIN
  IF _event_type NOT IN ('view','click','form_submit','custom') THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;

  -- Só aceita eventos para assets publicados
  SELECT a.workspace_id INTO v_workspace
  FROM public.builder_assets a
  WHERE a.id = _asset_id
    AND a.status = 'published'
    AND a.deleted_at IS NULL;

  IF v_workspace IS NULL THEN
    RAISE EXCEPTION 'Asset not published';
  END IF;

  -- Última publicação activa
  SELECT id INTO v_pub_id
  FROM public.builder_publications
  WHERE asset_id = _asset_id AND is_active = true
  ORDER BY published_at DESC
  LIMIT 1;

  INSERT INTO public.builder_page_events(
    workspace_id, asset_id, publication_id, event_type,
    slug, hostname, path, referrer, user_agent, session_id, metadata
  ) VALUES (
    v_workspace, _asset_id, v_pub_id, _event_type,
    _slug, _hostname, _path,
    NULLIF(left(_referrer, 500),''),
    NULLIF(left(_user_agent, 500),''),
    NULLIF(left(_session_id, 100),''),
    COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_builder_event(uuid,text,text,text,text,text,text,text,jsonb) TO anon, authenticated;

-- Verificação de domínio: marca verified_at se token bater
CREATE OR REPLACE FUNCTION public.verify_builder_domain(
  _domain_id uuid,
  _resolved_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_workspace uuid;
BEGIN
  SELECT verification_token, workspace_id
    INTO v_token, v_workspace
  FROM public.builder_asset_domains
  WHERE id = _domain_id;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Domain not found';
  END IF;

  -- Tem de ser membro do workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = v_workspace AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _resolved_token IS NOT NULL AND trim(_resolved_token) = v_token THEN
    UPDATE public.builder_asset_domains
       SET verified_at = now(), updated_at = now()
     WHERE id = _domain_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_builder_domain(uuid,text) TO authenticated;