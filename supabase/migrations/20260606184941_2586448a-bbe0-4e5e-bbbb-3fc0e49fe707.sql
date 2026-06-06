
-- Service enum
CREATE TYPE public.google_service AS ENUM ('gmail', 'calendar', 'drive', 'docs_sheets');

CREATE TABLE public.workspace_google_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  service public.google_service NOT NULL,
  google_email text,
  google_user_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_error text,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, service)
);

CREATE INDEX idx_wgc_workspace ON public.workspace_google_connections(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_google_connections TO authenticated;
GRANT ALL ON public.workspace_google_connections TO service_role;

ALTER TABLE public.workspace_google_connections ENABLE ROW LEVEL SECURITY;

-- Safe view without token columns (for client reads)
CREATE OR REPLACE VIEW public.workspace_google_connections_safe
WITH (security_invoker = true) AS
SELECT
  id, workspace_id, service, google_email, google_user_id,
  token_expires_at, scopes, is_active, last_error, connected_by,
  created_at, updated_at,
  (refresh_token IS NOT NULL) AS has_refresh_token
FROM public.workspace_google_connections;

GRANT SELECT ON public.workspace_google_connections_safe TO authenticated;

-- Members of the workspace can read safe view & delete row (disconnect)
CREATE POLICY "wgc_members_select"
ON public.workspace_google_connections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_google_connections.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "wgc_members_delete"
ON public.workspace_google_connections
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_google_connections.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Writes (insert/update) only via service_role from edge functions; no policy needed for authenticated.

CREATE TRIGGER trg_wgc_updated_at
BEFORE UPDATE ON public.workspace_google_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
