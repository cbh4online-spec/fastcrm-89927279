ALTER TABLE public.whatsapp_provider_instances DROP CONSTRAINT IF EXISTS whatsapp_provider_instances_provider_check;
ALTER TABLE public.whatsapp_provider_instances ADD CONSTRAINT whatsapp_provider_instances_provider_check
  CHECK (provider_name IN ('zapi','zapy','meta_cloud_api','twilio','mock','other','wascript'));

CREATE TABLE IF NOT EXISTS public.whatsapp_wascript_connections (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
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

-- Token da API é secreto: só funções de servidor (service_role) leem/escrevem.
ALTER TABLE public.whatsapp_wascript_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_wascript_connections FROM anon, authenticated;
GRANT ALL ON public.whatsapp_wascript_connections TO service_role;
