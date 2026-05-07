-- 1) Guard-rail: a mesma conta social não pode estar ativa em 2 workspaces ao mesmo tempo
CREATE UNIQUE INDEX IF NOT EXISTS idx_ghl_social_active_unique
  ON public.workspace_ghl_social_channels (ghl_account_id, channel_type)
  WHERE is_active = true;

-- 2) Audit trail das decisões de routing GHL (sync + webhook)
CREATE TABLE IF NOT EXISTS public.ghl_routing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL, -- 'sync_conversations' | 'webhook' | 'cleanup'
  source_workspace_id uuid,
  resolved_workspace_id uuid,
  ghl_location_id text,
  ghl_conversation_id text,
  ghl_account_id text,
  channel_type text,
  action text NOT NULL, -- 'imported' | 'skipped_wrong_workspace' | 'unrouted' | 'moved'
  reason text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghl_routing_audit_workspace ON public.ghl_routing_audit (source_workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ghl_routing_audit_action ON public.ghl_routing_audit (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ghl_routing_audit_conv ON public.ghl_routing_audit (ghl_conversation_id);

ALTER TABLE public.ghl_routing_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view routing audit"
  ON public.ghl_routing_audit FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Service role can insert routing audit"
  ON public.ghl_routing_audit FOR INSERT
  WITH CHECK (true);
