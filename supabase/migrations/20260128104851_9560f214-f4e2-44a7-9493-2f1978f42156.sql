-- Tabela de configuracao GHL por workspace
CREATE TABLE public.workspace_ghl_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
  ghl_location_id text,
  ghl_api_key_encrypted text,
  ghl_webhook_secret text,
  is_active boolean DEFAULT false,
  sync_contacts boolean DEFAULT true,
  sync_messages boolean DEFAULT true,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indice para lookup rapido por location
CREATE INDEX idx_workspace_ghl_config_location 
ON public.workspace_ghl_config(ghl_location_id);

-- RLS
ALTER TABLE public.workspace_ghl_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros podem ver config GHL do workspace"
ON public.workspace_ghl_config FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Membros podem inserir config GHL do workspace"
ON public.workspace_ghl_config FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Membros podem atualizar config GHL do workspace"
ON public.workspace_ghl_config FOR UPDATE
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Membros podem apagar config GHL do workspace"
ON public.workspace_ghl_config FOR DELETE
USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

-- Tabela de log de sync para idempotencia
CREATE TABLE public.ghl_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  ghl_entity_type text NOT NULL,
  ghl_entity_id text NOT NULL,
  fastcrm_entity_type text NOT NULL,
  fastcrm_entity_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  processed_at timestamp with time zone DEFAULT now(),
  UNIQUE (workspace_id, ghl_entity_type, ghl_entity_id)
);

CREATE INDEX idx_ghl_sync_log_lookup 
ON public.ghl_sync_log(workspace_id, ghl_entity_type, ghl_entity_id);

ALTER TABLE public.ghl_sync_log ENABLE ROW LEVEL SECURITY;

-- Service role only - webhooks usam service role
CREATE POLICY "Service role only for ghl_sync_log" ON public.ghl_sync_log
FOR ALL USING (false);

-- Colunas extras nas tabelas existentes
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ghl_contact_id text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ghl_synced_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_leads_ghl_contact ON public.leads(workspace_id, ghl_contact_id);

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS ghl_contact_id text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS ghl_synced_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_contacts_ghl_contact ON public.contacts(workspace_id, ghl_contact_id);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS ghl_message_id text;
CREATE INDEX IF NOT EXISTS idx_messages_ghl ON public.messages(workspace_id, ghl_message_id);

-- Trigger para updated_at
CREATE TRIGGER update_workspace_ghl_config_updated_at
  BEFORE UPDATE ON public.workspace_ghl_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();