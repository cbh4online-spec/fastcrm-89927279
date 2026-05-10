ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS whatsapp_pro_sla_first_response_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS whatsapp_pro_sla_resolution_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS whatsapp_pro_auto_assign_enabled boolean NOT NULL DEFAULT false;