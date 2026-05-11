
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS birthday_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS birthday_message_template text NOT NULL DEFAULT 'Olá {{name}}! 🎉 Toda a equipa deseja-lhe um feliz aniversário! 🎂',
  ADD COLUMN IF NOT EXISTS birthday_send_hour integer NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Lisbon';

CREATE TABLE IF NOT EXISTS public.whatsapp_birthday_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('contact','lead','company')),
  entity_id uuid NOT NULL,
  phone text,
  message_year integer NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, entity_type, entity_id, message_year)
);

CREATE INDEX IF NOT EXISTS idx_wa_birthday_logs_ws_year
  ON public.whatsapp_birthday_logs (workspace_id, message_year);

ALTER TABLE public.whatsapp_birthday_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_birthday_logs_select_members" ON public.whatsapp_birthday_logs;
CREATE POLICY "wa_birthday_logs_select_members"
  ON public.whatsapp_birthday_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = whatsapp_birthday_logs.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "wa_birthday_logs_service_write" ON public.whatsapp_birthday_logs;
CREATE POLICY "wa_birthday_logs_service_write"
  ON public.whatsapp_birthday_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);
