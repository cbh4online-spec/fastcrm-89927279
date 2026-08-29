-- Módulo "Contacto 1:1 validado"

CREATE TABLE public.outreach_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID,
  daily_limit INTEGER NOT NULL DEFAULT 20,
  per_company_limit INTEGER NOT NULL DEFAULT 2,
  cooldown_days INTEGER NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX outreach_settings_ws_user_key
  ON public.outreach_settings (workspace_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_settings TO authenticated;
GRANT ALL ON public.outreach_settings TO service_role;
ALTER TABLE public.outreach_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach_settings_members" ON public.outreach_settings
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.outreach_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company','contact','lead')),
  entity_id UUID NOT NULL,
  is_validated BOOLEAN NOT NULL DEFAULT false,
  legal_basis TEXT,
  consent_source TEXT,
  consent_recorded_at TIMESTAMPTZ,
  allowed_channels TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, entity_type, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_validations TO authenticated;
GRANT ALL ON public.outreach_validations TO service_role;
ALTER TABLE public.outreach_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach_validations_members" ON public.outreach_validations
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.outreach_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company','contact','lead')),
  entity_id UUID NOT NULL,
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  context_summary TEXT,
  value_proposition TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','used')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, entity_type, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_drafts TO authenticated;
GRANT ALL ON public.outreach_drafts TO service_role;
ALTER TABLE public.outreach_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach_drafts_members" ON public.outreach_drafts
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.outreach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company','contact','lead')),
  entity_id UUID NOT NULL,
  company_id UUID,
  channel TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('draft_created','draft_updated','reviewed','assisted_send','blocked','stopped')),
  reason TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX outreach_events_ws_created_idx ON public.outreach_events (workspace_id, created_at DESC);
CREATE INDEX outreach_events_entity_idx ON public.outreach_events (workspace_id, entity_type, entity_id);
GRANT SELECT, INSERT ON public.outreach_events TO authenticated;
GRANT ALL ON public.outreach_events TO service_role;
ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach_events_select" ON public.outreach_events
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "outreach_events_insert" ON public.outreach_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND created_by = auth.uid());

CREATE TABLE public.outreach_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company','contact','lead')),
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('opt_out','blocked','replied','manual')),
  channel TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, entity_type, entity_id, reason)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_suppressions TO authenticated;
GRANT ALL ON public.outreach_suppressions TO service_role;
ALTER TABLE public.outreach_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach_suppressions_members" ON public.outreach_suppressions
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
