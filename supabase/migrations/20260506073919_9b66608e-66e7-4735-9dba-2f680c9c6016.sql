-- 1. Extend whatsapp_provider_instances
ALTER TABLE public.whatsapp_provider_instances
  ADD COLUMN IF NOT EXISTS webhook_token text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS webhook_last_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_last_error text;

ALTER TABLE public.whatsapp_provider_instances
  DROP CONSTRAINT IF EXISTS whatsapp_provider_instances_environment_check;
ALTER TABLE public.whatsapp_provider_instances
  ADD CONSTRAINT whatsapp_provider_instances_environment_check
  CHECK (environment IN ('production','demo','sandbox'));

-- Backfill webhook_token for existing instances
UPDATE public.whatsapp_provider_instances
SET webhook_token = encode(gen_random_bytes(24), 'hex')
WHERE webhook_token IS NULL;

-- 2. Extend whatsapp_webhook_logs
ALTER TABLE public.whatsapp_webhook_logs
  ADD COLUMN IF NOT EXISTS provider_instance_id uuid REFERENCES public.whatsapp_provider_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS headers jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS normalized_payload jsonb,
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound',
  ADD COLUMN IF NOT EXISTS phone text;

CREATE INDEX IF NOT EXISTS idx_wa_webhook_logs_provider_instance
  ON public.whatsapp_webhook_logs(provider_instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_webhook_logs_phone
  ON public.whatsapp_webhook_logs(workspace_id, phone, created_at DESC);

-- 3. Create provider_request_logs (outbound)
CREATE TABLE IF NOT EXISTS public.provider_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_instance_id uuid REFERENCES public.whatsapp_provider_instances(id) ON DELETE SET NULL,
  provider_name text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound','inbound')),
  endpoint text,
  request_payload jsonb,
  response_payload jsonb,
  status_code integer,
  success boolean NOT NULL DEFAULT false,
  error text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prl_workspace_created ON public.provider_request_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prl_provider_instance ON public.provider_request_logs(provider_instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prl_failed ON public.provider_request_logs(workspace_id) WHERE success = false;

ALTER TABLE public.provider_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prl_select_members" ON public.provider_request_logs
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "prl_insert_service" ON public.provider_request_logs
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "prl_update_service" ON public.provider_request_logs
  FOR UPDATE TO service_role USING (true);

-- 4. RPC to regenerate webhook token (admins only)
CREATE OR REPLACE FUNCTION public.regenerate_provider_webhook_token(p_instance_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_new_token text;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM public.whatsapp_provider_instances
  WHERE id = p_instance_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'provider_instance_not_found';
  END IF;

  IF NOT (is_workspace_admin_or_owner(auth.uid(), v_workspace_id) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  v_new_token := encode(gen_random_bytes(24), 'hex');

  UPDATE public.whatsapp_provider_instances
  SET webhook_token = v_new_token,
      updated_at = now()
  WHERE id = p_instance_id;

  RETURN v_new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_provider_webhook_token(uuid) TO authenticated;