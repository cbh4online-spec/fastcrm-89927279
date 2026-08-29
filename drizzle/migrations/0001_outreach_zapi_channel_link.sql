-- Ligação configurável (por workspace) entre o módulo "Contacto 1:1 validado" e a
-- instância Z-API já existente em public.whatsapp_zapi_connections.
-- NUNCA guarda segredos: apenas referencia a ligação existente e o modo de operação.
CREATE TABLE IF NOT EXISTS public.outreach_channel_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'zapi',
  -- disabled: adaptador inerte | simulation: valida e simula, sem chamada externa | live: envio real (bloqueado até activação explícita)
  mode TEXT NOT NULL DEFAULT 'disabled',
  enabled BOOLEAN NOT NULL DEFAULT false,
  instance_ref TEXT,
  last_diagnostic_at TIMESTAMPTZ,
  last_diagnostic JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outreach_channel_links_mode_chk CHECK (mode IN ('disabled','simulation','live')),
  CONSTRAINT outreach_channel_links_provider_chk CHECK (provider IN ('zapi')),
  CONSTRAINT outreach_channel_links_unique UNIQUE (workspace_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_channel_links TO authenticated;
GRANT ALL ON public.outreach_channel_links TO service_role;

ALTER TABLE public.outreach_channel_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach_channel_links_select" ON public.outreach_channel_links
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "outreach_channel_links_write" ON public.outreach_channel_links
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- Auditoria de tentativas de envio (sem conteúdo sensível: só ids técnicos e resultado).
CREATE TABLE IF NOT EXISTS public.outreach_send_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  company_id UUID,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  provider TEXT NOT NULL DEFAULT 'zapi',
  mode TEXT NOT NULL DEFAULT 'simulation',
  outcome TEXT NOT NULL,
  blocked_reason TEXT,
  failed_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider_message_id TEXT,
  instance_ref TEXT,
  draft_id UUID,
  body_length INTEGER,
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outreach_send_attempts_outcome_chk CHECK (outcome IN ('blocked','simulated','sent','error')),
  CONSTRAINT outreach_send_attempts_entity_chk CHECK (entity_type IN ('company','contact','lead'))
);

CREATE INDEX IF NOT EXISTS idx_outreach_send_attempts_ws ON public.outreach_send_attempts (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_send_attempts_entity ON public.outreach_send_attempts (workspace_id, entity_type, entity_id, created_at DESC);

GRANT SELECT ON public.outreach_send_attempts TO authenticated;
GRANT ALL ON public.outreach_send_attempts TO service_role;

ALTER TABLE public.outreach_send_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach_send_attempts_select" ON public.outreach_send_attempts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
