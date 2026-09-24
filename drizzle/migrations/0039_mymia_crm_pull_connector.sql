-- Conector direto (pull) ao CRM do mymia.world: contactos, atividades e conversas.
ALTER TABLE public.mymia_crm_sync_settings
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS pull_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pull_conversations boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_pull_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_pull_summary jsonb;

CREATE TABLE IF NOT EXISTS public.mymia_crm_conversation_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  external_conversation_id text NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mymia_crm_conversation_links_external_unique
  ON public.mymia_crm_conversation_links (workspace_id, external_conversation_id);

GRANT SELECT ON public.mymia_crm_conversation_links TO authenticated;
GRANT ALL ON public.mymia_crm_conversation_links TO service_role;
ALTER TABLE public.mymia_crm_conversation_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem ligacoes de conversas mymia"
ON public.mymia_crm_conversation_links FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE IF NOT EXISTS public.mymia_crm_message_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  external_message_id text NOT NULL,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mymia_crm_message_links_external_unique
  ON public.mymia_crm_message_links (workspace_id, external_message_id);
CREATE INDEX IF NOT EXISTS mymia_crm_message_links_msg_idx
  ON public.mymia_crm_message_links (message_id);

GRANT SELECT ON public.mymia_crm_message_links TO authenticated;
GRANT ALL ON public.mymia_crm_message_links TO service_role;
ALTER TABLE public.mymia_crm_message_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem ligacoes de mensagens mymia"
ON public.mymia_crm_message_links FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));