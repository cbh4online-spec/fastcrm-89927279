CREATE TABLE IF NOT EXISTS public.communication_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  channel_type text NOT NULL CHECK (channel_type IN (
    'whatsapp','email','instagram_dm','facebook_messenger',
    'website_chat','website_form','phone','sms','telegram','manual'
  )),
  display_name text NOT NULL,
  provider_name text,
  provider_instance_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','error','pending_setup')),
  default_country text,
  default_language text DEFAULT 'pt-PT',
  assigned_team_id uuid,
  routing_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_channels_workspace ON public.communication_channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_comm_channels_type ON public.communication_channels(workspace_id, channel_type);
CREATE INDEX IF NOT EXISTS idx_comm_channels_status ON public.communication_channels(workspace_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_channels_default_per_type
  ON public.communication_channels(workspace_id, channel_type)
  WHERE provider_instance_id IS NULL;

CREATE TABLE IF NOT EXISTS public.communication_channel_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  channel_id uuid NOT NULL REFERENCES public.communication_channels(id) ON DELETE CASCADE,
  channel_type text NOT NULL,
  account_name text,
  account_identifier text,
  provider_name text,
  credentials_secret_name text,
  webhook_url text,
  webhook_token text,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_accounts_workspace ON public.communication_channel_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_comm_accounts_channel ON public.communication_channel_accounts(channel_id);
CREATE INDEX IF NOT EXISTS idx_comm_accounts_identifier ON public.communication_channel_accounts(workspace_id, channel_type, account_identifier);

CREATE TABLE IF NOT EXISTS public.communication_channel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  channel_id uuid REFERENCES public.communication_channels(id) ON DELETE SET NULL,
  channel_type text NOT NULL,
  provider_name text,
  event_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound','status','system')),
  conversation_id uuid,
  message_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload jsonb,
  processed boolean NOT NULL DEFAULT false,
  error text,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_logs_workspace ON public.communication_channel_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_logs_channel ON public.communication_channel_logs(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_logs_conversation ON public.communication_channel_logs(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comm_logs_unprocessed ON public.communication_channel_logs(workspace_id, processed) WHERE processed = false;

DROP TRIGGER IF EXISTS trg_comm_channels_updated_at ON public.communication_channels;
CREATE TRIGGER trg_comm_channels_updated_at
BEFORE UPDATE ON public.communication_channels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_comm_accounts_updated_at ON public.communication_channel_accounts;
CREATE TRIGGER trg_comm_accounts_updated_at
BEFORE UPDATE ON public.communication_channel_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.auto_register_whatsapp_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.channel = 'whatsapp' AND NEW.workspace_id IS NOT NULL THEN
    INSERT INTO public.communication_channels (workspace_id, channel_type, display_name, status, settings)
    VALUES (NEW.workspace_id, 'whatsapp', 'WhatsApp', 'active', '{"auto_registered": true}'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_register_whatsapp_channel ON public.conversations;
CREATE TRIGGER trg_auto_register_whatsapp_channel
AFTER INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.auto_register_whatsapp_channel();

CREATE OR REPLACE VIEW public.communication_conversations_unified
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.workspace_id,
  c.channel AS channel_type,
  ch.id AS channel_id,
  ch.display_name AS channel_display_name,
  ch.provider_name AS channel_provider_name,
  c.contact_id,
  c.lead_id,
  c.company_id,
  c.assigned_to,
  c.status,
  c.external_thread_id,
  c.last_message_at,
  c.last_message_preview,
  c.last_message_direction,
  c.unread_count,
  c.tags,
  c.user_tags,
  c.ai_tags,
  c.ai_intent,
  c.ai_sentiment,
  c.ai_priority,
  c.user_priority,
  c.conversation_priority_score,
  c.sla_deadline,
  c.potential_value_estimate,
  c.requires_human,
  c.first_response_at,
  c.resolved_at,
  c.created_at,
  c.updated_at
FROM public.conversations c
LEFT JOIN LATERAL (
  SELECT id, display_name, provider_name
  FROM public.communication_channels
  WHERE workspace_id = c.workspace_id AND channel_type = c.channel
  ORDER BY created_at ASC
  LIMIT 1
) ch ON true;

ALTER TABLE public.communication_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_channel_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_channel_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view channels"
ON public.communication_channels FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins manage channels"
ON public.communication_channels FOR ALL
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members view channel accounts"
ON public.communication_channel_accounts FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins manage channel accounts"
ON public.communication_channel_accounts FOR ALL
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members view channel logs"
ON public.communication_channel_logs FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));
