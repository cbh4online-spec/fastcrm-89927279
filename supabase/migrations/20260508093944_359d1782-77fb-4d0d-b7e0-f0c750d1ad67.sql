
-- LeadChef appointments table — Fase 4
CREATE TABLE IF NOT EXISTS public.leadchef_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.leadchef_lead_profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  title TEXT NOT NULL,
  notes TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  location TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  outcome TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leadchef_appointments_status_chk CHECK (status IN ('scheduled','completed','cancelled','rescheduled','overdue')),
  CONSTRAINT leadchef_appointments_type_chk CHECK (type IN (
    'phone_call','whatsapp','follow_up','demo','post_sale_visit',
    'cooking_class','custom_visit','proposal','referral','recruitment',
    'team_meeting','training','note','other'
  ))
);

CREATE INDEX IF NOT EXISTS idx_leadchef_appointments_ws_scheduled ON public.leadchef_appointments(workspace_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_leadchef_appointments_lead ON public.leadchef_appointments(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leadchef_appointments_ws_status ON public.leadchef_appointments(workspace_id, status);

ALTER TABLE public.leadchef_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leadchef_appointments_ws_select"
  ON public.leadchef_appointments FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "leadchef_appointments_ws_insert"
  ON public.leadchef_appointments FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "leadchef_appointments_ws_update"
  ON public.leadchef_appointments FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "leadchef_appointments_ws_delete"
  ON public.leadchef_appointments FOR DELETE
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE TRIGGER trg_leadchef_appointments_updated_at
  BEFORE UPDATE ON public.leadchef_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
