CREATE TABLE IF NOT EXISTS public.whatsapp_wascript_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  api_token text NOT NULL,
  webhook_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','error','disconnected')),
  last_error text,
  last_checked_at timestamptz,
  last_inbound_at timestamptz,
  connected_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.whatsapp_wascript_connections FROM anon, authenticated;
GRANT ALL ON public.whatsapp_wascript_connections TO service_role;
ALTER TABLE public.whatsapp_wascript_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_provider_instances DROP CONSTRAINT IF EXISTS whatsapp_provider_instances_provider_name_check;
ALTER TABLE public.whatsapp_provider_instances ADD CONSTRAINT whatsapp_provider_instances_provider_name_check
  CHECK (provider_name = ANY (ARRAY['zapi','zapy','meta_cloud_api','twilio','mock','other','wascript']));