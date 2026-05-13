
CREATE TABLE IF NOT EXISTS public.leadchef_scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.leadchef_lead_profiles(id) ON DELETE SET NULL,
  agent_id uuid,
  source_appointment_id uuid REFERENCES public.leadchef_appointments(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.leadchef_message_templates(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  rendered_body text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','sent','cancelled','failed')),
  cancel_reason text
    CHECK (cancel_reason IS NULL OR cancel_reason IN ('manual','lead_replied','stage_changed','phone_invalid','no_whatsapp','other')),
  cancelled_by uuid,
  sent_at timestamptz,
  cancelled_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leadchef_scheduled_messages_unique_per_appt
    UNIQUE (source_appointment_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_lcsm_due
  ON public.leadchef_scheduled_messages (status, scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_lcsm_workspace
  ON public.leadchef_scheduled_messages (workspace_id, status, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS idx_lcsm_lead
  ON public.leadchef_scheduled_messages (lead_id, status);

CREATE TRIGGER trg_lcsm_updated
BEFORE UPDATE ON public.leadchef_scheduled_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leadchef_scheduled_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: membros do workspace
CREATE POLICY "lcsm_select_members"
ON public.leadchef_scheduled_messages
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = leadchef_scheduled_messages.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- INSERT: membros (cria-se quando uma demo é concluída)
CREATE POLICY "lcsm_insert_members"
ON public.leadchef_scheduled_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = leadchef_scheduled_messages.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- UPDATE: membros podem cancelar (status -> cancelled). Restantes campos via service_role.
CREATE POLICY "lcsm_update_cancel_only"
ON public.leadchef_scheduled_messages
FOR UPDATE
TO authenticated
USING (
  status = 'scheduled'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = leadchef_scheduled_messages.workspace_id
      AND wm.user_id = auth.uid()
  )
)
WITH CHECK (
  status = 'cancelled'
);
