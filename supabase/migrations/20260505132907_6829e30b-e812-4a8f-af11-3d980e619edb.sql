-- =============================================================================
-- Z-API WhatsApp Connections (Fase 1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_zapi_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  
  -- Z-API instance credentials
  instance_id TEXT,
  instance_token TEXT,
  client_token TEXT,
  
  -- Account mode: 'master' = managed by platform, 'byo' = bring your own Z-API account
  account_mode TEXT NOT NULL DEFAULT 'master' CHECK (account_mode IN ('master', 'byo')),
  
  -- Connection state
  status TEXT NOT NULL DEFAULT 'not_configured' CHECK (status IN (
    'not_configured', 'creating_instance', 'qr_pending', 'waiting_for_scan',
    'authenticating', 'connected', 'disconnected', 'qr_expired', 'reconnecting', 'error'
  )),
  phone_number TEXT,
  qr_code TEXT,
  qr_updated_at TIMESTAMPTZ,
  
  -- Sync tracking
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_inbound_message_at TIMESTAMPTZ,
  last_outbound_message_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Webhook security
  webhook_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Free-form metadata (e.g. battery, profile info, plan)
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Audit
  connected_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT whatsapp_zapi_connections_workspace_unique UNIQUE (workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_zapi_workspace ON public.whatsapp_zapi_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_zapi_instance ON public.whatsapp_zapi_connections(instance_id) WHERE instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_zapi_status ON public.whatsapp_zapi_connections(status);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.whatsapp_zapi_connections ENABLE ROW LEVEL SECURITY;

-- Workspace members can view their workspace connection
CREATE POLICY "Workspace members can view zapi connection"
ON public.whatsapp_zapi_connections
FOR SELECT
TO authenticated
USING (
  is_workspace_member(workspace_id, auth.uid())
  OR is_super_admin(auth.uid())
);

-- Workspace admins can insert their workspace connection
CREATE POLICY "Workspace members can insert zapi connection"
ON public.whatsapp_zapi_connections
FOR INSERT
TO authenticated
WITH CHECK (
  is_workspace_member(workspace_id, auth.uid())
  OR is_super_admin(auth.uid())
);

-- Workspace members can update non-sensitive fields (status toggling, soft disconnect)
-- Sensitive fields (tokens) should be set via service_role from edge functions
CREATE POLICY "Workspace members can update zapi connection"
ON public.whatsapp_zapi_connections
FOR UPDATE
TO authenticated
USING (
  is_workspace_member(workspace_id, auth.uid())
  OR is_super_admin(auth.uid())
)
WITH CHECK (
  is_workspace_member(workspace_id, auth.uid())
  OR is_super_admin(auth.uid())
);

-- Workspace admins / super_admin can delete
CREATE POLICY "Workspace members can delete zapi connection"
ON public.whatsapp_zapi_connections
FOR DELETE
TO authenticated
USING (
  is_workspace_member(workspace_id, auth.uid())
  OR is_super_admin(auth.uid())
);

-- =============================================================================
-- updated_at trigger
-- =============================================================================

CREATE TRIGGER set_whatsapp_zapi_updated_at
BEFORE UPDATE ON public.whatsapp_zapi_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Soft-disconnect existing Evolution connections to force re-onboarding via Z-API
-- =============================================================================

UPDATE public.whatsapp_qr_connections
SET 
  status = 'disconnected',
  disconnected_at = COALESCE(disconnected_at, now()),
  last_error = COALESCE(last_error, 'Migrated to Z-API — reconnect required'),
  updated_at = now()
WHERE status NOT IN ('disconnected', 'not_configured');
