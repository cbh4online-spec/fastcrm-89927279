-- 1) Tabela de logs de webhook
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  connection_id uuid REFERENCES public.whatsapp_zapi_connections(id) ON DELETE SET NULL,
  instance_id text,
  event_type text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  processing_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_webhook_logs_workspace ON public.whatsapp_webhook_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_webhook_logs_connection ON public.whatsapp_webhook_logs(connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_webhook_logs_unprocessed ON public.whatsapp_webhook_logs(workspace_id) WHERE processed = false;

ALTER TABLE public.whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view webhook logs"
ON public.whatsapp_webhook_logs FOR SELECT
TO authenticated
USING (is_workspace_member(workspace_id, auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Service role can insert webhook logs"
ON public.whatsapp_webhook_logs FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update webhook logs"
ON public.whatsapp_webhook_logs FOR UPDATE
TO service_role
USING (true);

-- 2) Colunas extra em whatsapp_zapi_connections
ALTER TABLE public.whatsapp_zapi_connections
  ADD COLUMN IF NOT EXISTS instance_name text,
  ADD COLUMN IF NOT EXISTS webhook_configured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_last_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_last_error text,
  ADD COLUMN IF NOT EXISTS ai_auto_analyze boolean NOT NULL DEFAULT true;

-- 3) Cache de análise IA na conversa
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS ai_analysis_json jsonb,
  ADD COLUMN IF NOT EXISTS ai_analysis_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_analysis_message_count integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_conversations_ai_analysis_at ON public.conversations(ai_analysis_at DESC) WHERE ai_analysis_json IS NOT NULL;

-- 4) Função utilitária para registar log de webhook (usada pela edge function)
CREATE OR REPLACE FUNCTION public.log_whatsapp_webhook(
  p_workspace_id uuid,
  p_connection_id uuid,
  p_instance_id text,
  p_event_type text,
  p_payload jsonb,
  p_processed boolean,
  p_error text,
  p_processing_ms integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.whatsapp_webhook_logs(
    workspace_id, connection_id, instance_id, event_type,
    payload, processed, error_message, processing_ms
  ) VALUES (
    p_workspace_id, p_connection_id, p_instance_id, p_event_type,
    COALESCE(p_payload, '{}'::jsonb), COALESCE(p_processed, false), p_error, p_processing_ms
  ) RETURNING id INTO v_log_id;

  -- Atualizar última receção na connection
  IF p_connection_id IS NOT NULL THEN
    UPDATE public.whatsapp_zapi_connections
    SET webhook_last_received_at = now(),
        webhook_last_error = CASE WHEN COALESCE(p_processed, false) THEN NULL ELSE p_error END,
        webhook_configured = true,
        updated_at = now()
    WHERE id = p_connection_id;
  END IF;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_whatsapp_webhook(uuid, uuid, text, text, jsonb, boolean, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_whatsapp_webhook(uuid, uuid, text, text, jsonb, boolean, text, integer) TO service_role;