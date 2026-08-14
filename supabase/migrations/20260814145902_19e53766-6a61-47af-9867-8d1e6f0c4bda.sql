CREATE TABLE IF NOT EXISTS public.user_whatsapp_call_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_number text,
  preferred_device text NOT NULL DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_whatsapp_call_settings_device_check CHECK (preferred_device IN ('auto','desktop','mobile')),
  CONSTRAINT user_whatsapp_call_settings_unique UNIQUE (workspace_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_whatsapp_call_settings TO authenticated;
GRANT ALL ON public.user_whatsapp_call_settings TO service_role;

ALTER TABLE public.user_whatsapp_call_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own whatsapp call settings select" ON public.user_whatsapp_call_settings
FOR SELECT TO authenticated
USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = user_whatsapp_call_settings.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "own whatsapp call settings insert" ON public.user_whatsapp_call_settings
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = user_whatsapp_call_settings.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "own whatsapp call settings update" ON public.user_whatsapp_call_settings
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = user_whatsapp_call_settings.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "own whatsapp call settings delete" ON public.user_whatsapp_call_settings
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_user_whatsapp_call_settings_updated_at
BEFORE UPDATE ON public.user_whatsapp_call_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_voice_call_logs_ws_type_status
ON public.voice_call_logs (workspace_id, call_type, status);