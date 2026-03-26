
CREATE TABLE public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  autopilot_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_persona TEXT DEFAULT '',
  welcome_message TEXT DEFAULT '',
  away_message TEXT DEFAULT '',
  business_hours_only BOOLEAN NOT NULL DEFAULT false,
  auto_create_leads BOOLEAN NOT NULL DEFAULT true,
  notify_on_new_message BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view whatsapp settings"
  ON public.whatsapp_settings
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can insert whatsapp settings"
  ON public.whatsapp_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can update whatsapp settings"
  ON public.whatsapp_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete whatsapp settings"
  ON public.whatsapp_settings
  FOR DELETE
  TO authenticated
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));
