-- 1. Playbook comercial dos templates WhatsApp (metadados aditivos)
CREATE TABLE IF NOT EXISTS public.whatsapp_template_playbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  template_id uuid,
  code text NOT NULL,
  name text NOT NULL,
  family text NOT NULL,
  subfamily text,
  channel text NOT NULL DEFAULT 'whatsapp',
  pipeline_stage text,
  objective text,
  description text,
  message_body text NOT NULL,
  timing_min_minutes integer,
  timing_max_minutes integer,
  use_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  exclusion_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_variables text[] NOT NULL DEFAULT '{}'::text[],
  variable_fallbacks jsonb NOT NULL DEFAULT '{}'::jsonb,
  cta text,
  behavioral_principle text,
  primary_kpi text,
  priority integer NOT NULL DEFAULT 50,
  execution_mode text NOT NULL DEFAULT 'assisted',
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_template_playbook_code_unique UNIQUE (workspace_id, code),
  CONSTRAINT whatsapp_template_playbook_family_check CHECK (
    family IN ('lead_new','qualification','scheduling','proposal','closing','reactivation','post_sale')
  ),
  CONSTRAINT whatsapp_template_playbook_mode_check CHECK (
    execution_mode IN ('automatic','assisted','manual')
  )
);

CREATE INDEX IF NOT EXISTS idx_wa_template_playbook_ws_family
  ON public.whatsapp_template_playbook (workspace_id, family, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_template_playbook TO authenticated;
GRANT ALL ON public.whatsapp_template_playbook TO service_role;

ALTER TABLE public.whatsapp_template_playbook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_template_playbook_select" ON public.whatsapp_template_playbook
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "wa_template_playbook_write" ON public.whatsapp_template_playbook
  FOR ALL TO authenticated
  USING (public.can_manage_workspace(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.can_manage_workspace(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- 2. Perfil comercial da lead (apenas campos inexistentes em public.leads)
CREATE TABLE IF NOT EXISTS public.lead_commercial_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  objetivo_cliente text,
  problema_principal text,
  consequencia text,
  timing text,
  objecao_principal text,
  first_reply_at timestamptz,
  last_outbound_at timestamptz,
  last_inbound_at timestamptz,
  next_action_at timestamptz,
  snooze_until timestamptz,
  stop_contact boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_commercial_profile_lead_unique UNIQUE (lead_id),
  CONSTRAINT lead_commercial_profile_timing_check CHECK (
    timing IS NULL OR timing IN ('quente','morna','exploratoria')
  )
);

CREATE INDEX IF NOT EXISTS idx_lead_commercial_profile_ws
  ON public.lead_commercial_profile (workspace_id, next_action_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_commercial_profile TO authenticated;
GRANT ALL ON public.lead_commercial_profile TO service_role;

ALTER TABLE public.lead_commercial_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_commercial_profile_member_all" ON public.lead_commercial_profile
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
