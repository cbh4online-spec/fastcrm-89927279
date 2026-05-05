-- =========================================================
-- FastCRM WhatsApp Pro — Fase 1
-- =========================================================

-- 1) Provider Instances (camada abstracta sobre whatsapp_zapi_connections)
CREATE TABLE IF NOT EXISTS public.whatsapp_provider_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_name text NOT NULL DEFAULT 'zapi',
  display_name text,
  base_url text,
  external_instance_id text,
  api_token_secret_name text,
  default_country text NOT NULL DEFAULT 'PT',
  default_country_code text NOT NULL DEFAULT '+351',
  active boolean NOT NULL DEFAULT true,
  -- ponte com integração existente (não obrigatório)
  zapi_connection_id uuid REFERENCES public.whatsapp_zapi_connections(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_provider_instances_provider_check
    CHECK (provider_name IN ('zapi','zapy','meta_cloud_api','twilio','mock','other'))
);

CREATE INDEX IF NOT EXISTS idx_wpi_workspace ON public.whatsapp_provider_instances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wpi_active ON public.whatsapp_provider_instances(workspace_id, active);

ALTER TABLE public.whatsapp_provider_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wpi_select_members" ON public.whatsapp_provider_instances
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "wpi_insert_admins" ON public.whatsapp_provider_instances
  FOR INSERT WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id));
CREATE POLICY "wpi_update_admins" ON public.whatsapp_provider_instances
  FOR UPDATE USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));
CREATE POLICY "wpi_delete_admins" ON public.whatsapp_provider_instances
  FOR DELETE USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));
CREATE POLICY "wpi_super_admin_all" ON public.whatsapp_provider_instances
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- 2) Product Shares
CREATE TABLE IF NOT EXISTS public.whatsapp_product_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  agent_id uuid,
  provider_message_id text,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  clicked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wps_workspace ON public.whatsapp_product_shares(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wps_contact ON public.whatsapp_product_shares(contact_id);
CREATE INDEX IF NOT EXISTS idx_wps_product ON public.whatsapp_product_shares(product_id);
CREATE INDEX IF NOT EXISTS idx_wps_conversation ON public.whatsapp_product_shares(conversation_id);

ALTER TABLE public.whatsapp_product_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wps_select_members" ON public.whatsapp_product_shares
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "wps_insert_members" ON public.whatsapp_product_shares
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "wps_update_members" ON public.whatsapp_product_shares
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "wps_delete_admins" ON public.whatsapp_product_shares
  FOR DELETE USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));
CREATE POLICY "wps_super_admin_all" ON public.whatsapp_product_shares
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- 3) Communication Events (específico WhatsApp Pro)
CREATE TABLE IF NOT EXISTS public.whatsapp_communication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wce_workspace_created ON public.whatsapp_communication_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wce_event_type ON public.whatsapp_communication_events(event_type);
CREATE INDEX IF NOT EXISTS idx_wce_conversation ON public.whatsapp_communication_events(conversation_id);

ALTER TABLE public.whatsapp_communication_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wce_select_members" ON public.whatsapp_communication_events
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "wce_insert_members" ON public.whatsapp_communication_events
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "wce_super_admin_all" ON public.whatsapp_communication_events
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- 4) WhatsApp Templates Metadata (camada por cima de communication_templates)
CREATE TABLE IF NOT EXISTS public.whatsapp_templates_meta (
  template_id uuid PRIMARY KEY REFERENCES public.communication_templates(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  country text NOT NULL DEFAULT 'PT',
  suggested_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wtm_workspace ON public.whatsapp_templates_meta(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wtm_category ON public.whatsapp_templates_meta(workspace_id, category);

ALTER TABLE public.whatsapp_templates_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wtm_select_members" ON public.whatsapp_templates_meta
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "wtm_write_members" ON public.whatsapp_templates_meta
  FOR ALL USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- 5) Vista whatsapp_templates (combina communication_templates + meta)
CREATE OR REPLACE VIEW public.whatsapp_templates_view
WITH (security_invoker = on) AS
SELECT
  ct.id,
  ct.workspace_id,
  ct.name,
  COALESCE(meta.category, 'general') AS category,
  ct.language,
  COALESCE(meta.country, 'PT') AS country,
  ct.body AS content,
  ct.dynamic_schema AS variables,
  ct.is_active AS active,
  meta.suggested_variables,
  meta.preview_image_url,
  ct.usage_count,
  ct.created_at,
  ct.updated_at
FROM public.communication_templates ct
LEFT JOIN public.whatsapp_templates_meta meta ON meta.template_id = ct.id
WHERE ct.channel = 'whatsapp' OR 'whatsapp' = ANY(COALESCE(ct.allowed_channels, ARRAY[]::text[]));

-- 6) Estender messages com campos para WhatsApp Pro
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_mime_type text,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.communication_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_message_type_check'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_message_type_check
      CHECK (message_type IN ('text','image','audio','video','document','product','template','system','internal_note','location','contact_card'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_product_id ON public.messages(product_id) WHERE product_id IS NOT NULL;

-- 7) Estender conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT '+351',
  ADD COLUMN IF NOT EXISTS provider_instance_id uuid REFERENCES public.whatsapp_provider_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_conversations_provider_instance ON public.conversations(provider_instance_id) WHERE provider_instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_channel_workspace ON public.conversations(workspace_id, channel, last_message_at DESC);

-- 8) Trigger updated_at em tabelas novas
CREATE OR REPLACE FUNCTION public.set_updated_at_wpi()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_wpi_updated_at ON public.whatsapp_provider_instances;
CREATE TRIGGER trg_wpi_updated_at BEFORE UPDATE ON public.whatsapp_provider_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_wpi();

DROP TRIGGER IF EXISTS trg_wtm_updated_at ON public.whatsapp_templates_meta;
CREATE TRIGGER trg_wtm_updated_at BEFORE UPDATE ON public.whatsapp_templates_meta
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_wpi();

-- 9) Função utilitária: garantir provider_instance a partir de zapi_connection
CREATE OR REPLACE FUNCTION public.ensure_whatsapp_provider_instance(p_workspace_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance_id uuid;
  v_zapi_id uuid;
BEGIN
  -- Já existe?
  SELECT id INTO v_instance_id
  FROM public.whatsapp_provider_instances
  WHERE workspace_id = p_workspace_id AND active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_instance_id IS NOT NULL THEN
    RETURN v_instance_id;
  END IF;

  -- Tentar ligar a uma zapi_connection existente
  SELECT id INTO v_zapi_id
  FROM public.whatsapp_zapi_connections
  WHERE workspace_id = p_workspace_id
  LIMIT 1;

  INSERT INTO public.whatsapp_provider_instances
    (workspace_id, provider_name, display_name, default_country, default_country_code, active, zapi_connection_id)
  VALUES
    (p_workspace_id, 'zapi', 'FastCRM WhatsApp Pro', 'PT', '+351', true, v_zapi_id)
  RETURNING id INTO v_instance_id;

  RETURN v_instance_id;
END $$;

-- 10) Função utilitária: emitir evento
CREATE OR REPLACE FUNCTION public.emit_whatsapp_event(
  p_workspace_id uuid,
  p_event_type text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_conversation_id uuid DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.whatsapp_communication_events
    (workspace_id, event_type, entity_type, entity_id, conversation_id, contact_id, payload, created_by)
  VALUES
    (p_workspace_id, p_event_type, p_entity_type, p_entity_id, p_conversation_id, p_contact_id, p_payload, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
