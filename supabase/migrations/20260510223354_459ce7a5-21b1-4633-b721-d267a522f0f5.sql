CREATE TABLE IF NOT EXISTS public.whatsapp_scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  created_by uuid NOT NULL,
  conversation_id uuid,
  contact_id uuid,
  lead_id uuid,
  to_phone text NOT NULL,
  body text NOT NULL,
  media_url text,
  media_mime_type text,
  scheduled_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Lisbon',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  external_message_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_scheduled_messages_status_check
    CHECK (status IN ('pending','sent','failed','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_wa_scheduled_workspace ON public.whatsapp_scheduled_messages(workspace_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_wa_scheduled_due ON public.whatsapp_scheduled_messages(status, scheduled_at) WHERE status = 'pending';

ALTER TABLE public.whatsapp_scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_sched_select_members"
  ON public.whatsapp_scheduled_messages FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "wa_sched_insert_members"
  ON public.whatsapp_scheduled_messages FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "wa_sched_update_members"
  ON public.whatsapp_scheduled_messages FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "wa_sched_delete_members"
  ON public.whatsapp_scheduled_messages FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER trg_wa_scheduled_updated_at
  BEFORE UPDATE ON public.whatsapp_scheduled_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();