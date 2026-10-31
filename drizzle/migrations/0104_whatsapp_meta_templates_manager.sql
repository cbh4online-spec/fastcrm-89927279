CREATE TABLE public.whatsapp_meta_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  provider_instance_id uuid,
  internal_name text NOT NULL,
  meta_name text NOT NULL,
  meta_template_id text,
  category text NOT NULL DEFAULT 'UTILITY',
  language text NOT NULL DEFAULT 'pt_PT',
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  automations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT',
  rejected_reason text,
  quality_score text,
  version int NOT NULL DEFAULT 1,
  parent_template_id uuid,
  created_by uuid,
  submitted_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX whatsapp_meta_templates_name_lang_uq ON public.whatsapp_meta_templates (workspace_id, meta_name, language) WHERE deleted_at IS NULL;
GRANT SELECT ON public.whatsapp_meta_templates TO authenticated;
GRANT ALL ON public.whatsapp_meta_templates TO service_role;
ALTER TABLE public.whatsapp_meta_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read meta templates" ON public.whatsapp_meta_templates FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

CREATE TABLE public.whatsapp_meta_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.whatsapp_meta_templates(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  version int NOT NULL,
  change_type text NOT NULL,
  snapshot jsonb NOT NULL,
  status text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.whatsapp_meta_template_versions (template_id, created_at DESC);
GRANT SELECT ON public.whatsapp_meta_template_versions TO authenticated;
GRANT ALL ON public.whatsapp_meta_template_versions TO service_role;
ALTER TABLE public.whatsapp_meta_template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read meta template versions" ON public.whatsapp_meta_template_versions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

CREATE TABLE public.whatsapp_meta_template_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.whatsapp_meta_templates(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  component text NOT NULL DEFAULT 'BODY',
  var_index int NOT NULL,
  crm_field text,
  example_value text,
  fallback_value text,
  UNIQUE (template_id, component, var_index)
);
GRANT SELECT ON public.whatsapp_meta_template_variables TO authenticated;
GRANT ALL ON public.whatsapp_meta_template_variables TO service_role;
ALTER TABLE public.whatsapp_meta_template_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read meta template vars" ON public.whatsapp_meta_template_variables FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

CREATE TABLE public.whatsapp_meta_template_button_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.whatsapp_meta_templates(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  button_key text NOT NULL,
  action_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  workflow_id uuid,
  UNIQUE (template_id, button_key, action_type)
);
GRANT SELECT ON public.whatsapp_meta_template_button_actions TO authenticated;
GRANT ALL ON public.whatsapp_meta_template_button_actions TO service_role;
ALTER TABLE public.whatsapp_meta_template_button_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read meta template actions" ON public.whatsapp_meta_template_button_actions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

CREATE TABLE public.whatsapp_meta_template_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  template_id uuid REFERENCES public.whatsapp_meta_templates(id) ON DELETE SET NULL,
  contact_id uuid,
  lead_id uuid,
  phone text,
  message_id text,
  event_type text NOT NULL,
  source text NOT NULL DEFAULT 'fastcrm',
  result text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX whatsapp_meta_template_events_dedupe ON public.whatsapp_meta_template_events (workspace_id, message_id, event_type) WHERE message_id IS NOT NULL;
GRANT SELECT ON public.whatsapp_meta_template_events TO authenticated;
GRANT ALL ON public.whatsapp_meta_template_events TO service_role;
ALTER TABLE public.whatsapp_meta_template_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read meta template events" ON public.whatsapp_meta_template_events FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));