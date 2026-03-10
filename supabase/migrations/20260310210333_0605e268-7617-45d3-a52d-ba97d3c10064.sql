
-- ========================================
-- FUNNEL OS V2 - Schema de Dados
-- ========================================

-- Capture Types (system lookup)
CREATE TABLE public.capture_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.capture_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capture_types_read" ON public.capture_types FOR SELECT TO authenticated USING (true);

-- Seed capture types
INSERT INTO public.capture_types (key, label, description, icon) VALUES
  ('form', 'Formulário', 'Captação por formulário de contacto', 'FileText'),
  ('quiz', 'Quiz Diagnóstico', 'Quiz interativo com segmentação', 'HelpCircle'),
  ('live', 'Inscrição para Live', 'Registo para evento ao vivo', 'Video'),
  ('masterclass', 'Masterclass', 'Inscrição para masterclass de conversão', 'GraduationCap'),
  ('mentorship', 'Candidatura a Mentoria', 'Aplicação para mentoria 1:1', 'Users'),
  ('whatsapp', 'Click-to-WhatsApp', 'CTA direto para WhatsApp', 'MessageCircle'),
  ('contact', 'Pedido de Contacto', 'Formulário simples de contacto', 'Phone'),
  ('recruitment', 'Recrutamento', 'Candidatura / recrutamento', 'Briefcase'),
  ('checkout', 'Checkout Direto', 'Venda direta com checkout', 'ShoppingCart'),
  ('calendar', 'Calendar Booking', 'Agendamento de chamada', 'Calendar');

-- Page Templates
CREATE TABLE public.page_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_type text NOT NULL DEFAULT 'landing',
  layout_schema jsonb DEFAULT '{}',
  appearance_schema jsonb DEFAULT '{}',
  seo_schema jsonb DEFAULT '{}',
  content_schema jsonb DEFAULT '{}',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.page_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_templates_read" ON public.page_templates FOR SELECT TO authenticated
  USING (is_system = true OR workspace_id IN (SELECT id FROM public.workspaces));
CREATE POLICY "page_templates_write" ON public.page_templates FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces));

-- Capture Assets
CREATE TABLE public.capture_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  capture_type_id uuid REFERENCES public.capture_types(id),
  asset_type text NOT NULL DEFAULT 'form',
  form_id uuid,
  quiz_id uuid,
  calendar_id uuid,
  checkout_id uuid,
  whatsapp_config_id uuid,
  fields_schema jsonb DEFAULT '[]',
  validation_schema jsonb DEFAULT '{}',
  consent_schema jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.capture_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capture_assets_workspace" ON public.capture_assets FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces));

-- Funnel Templates (reusable blueprints)
CREATE TABLE public.funnel_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  objective text,
  vertical_id uuid REFERENCES public.verticals(id) ON DELETE SET NULL,
  page_template_id uuid REFERENCES public.page_templates(id) ON DELETE SET NULL,
  capture_type_id uuid REFERENCES public.capture_types(id) ON DELETE SET NULL,
  default_routing_schema jsonb DEFAULT '{}',
  default_automation_schema jsonb DEFAULT '{}',
  default_event_schema jsonb DEFAULT '{}',
  default_kpi_schema jsonb DEFAULT '{}',
  thank_you_schema jsonb DEFAULT '{}',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.funnel_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funnel_templates_read" ON public.funnel_templates FOR SELECT TO authenticated
  USING (is_system = true OR workspace_id IN (SELECT id FROM public.workspaces));
CREATE POLICY "funnel_templates_write" ON public.funnel_templates FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces));

-- Funnel Instances (active funnels)
CREATE TABLE public.funnel_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  funnel_template_id uuid REFERENCES public.funnel_templates(id) ON DELETE SET NULL,
  vertical_id uuid REFERENCES public.verticals(id) ON DELETE SET NULL,
  page_template_id uuid REFERENCES public.page_templates(id) ON DELETE SET NULL,
  capture_type_id uuid REFERENCES public.capture_types(id) ON DELETE SET NULL,
  objective text,
  status text NOT NULL DEFAULT 'draft',
  preview_url text,
  public_url text,
  primary_domain_id uuid,
  path text,
  slug text,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.funnel_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funnel_instances_workspace" ON public.funnel_instances FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces));

-- Funnel Instance Steps
CREATE TABLE public.funnel_instance_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_instance_id uuid REFERENCES public.funnel_instances(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL DEFAULT 0,
  step_type text NOT NULL DEFAULT 'page',
  page_id uuid,
  action_schema jsonb DEFAULT '{}',
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.funnel_instance_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funnel_instance_steps_workspace" ON public.funnel_instance_steps FOR ALL TO authenticated
  USING (funnel_instance_id IN (SELECT id FROM public.funnel_instances));

-- Routing Rules
CREATE TABLE public.funnel_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_instance_id uuid REFERENCES public.funnel_instances(id) ON DELETE CASCADE NOT NULL,
  trigger_event text NOT NULL,
  pipeline_id uuid,
  stage_id uuid,
  owner_id uuid,
  team_id uuid,
  round_robin boolean DEFAULT false,
  tags_json jsonb DEFAULT '[]',
  score_rules_json jsonb DEFAULT '{}',
  priority integer DEFAULT 0,
  sla_minutes integer,
  conditions_json jsonb DEFAULT '{}',
  fallback_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.funnel_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routing_rules_workspace" ON public.funnel_routing_rules FOR ALL TO authenticated
  USING (funnel_instance_id IN (SELECT id FROM public.funnel_instances));

-- Automation Bindings
CREATE TABLE public.funnel_automation_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_instance_id uuid REFERENCES public.funnel_instances(id) ON DELETE CASCADE NOT NULL,
  trigger_event text NOT NULL,
  automation_id uuid,
  channel text,
  delay_minutes integer DEFAULT 0,
  config_json jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.funnel_automation_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_bindings_workspace" ON public.funnel_automation_bindings FOR ALL TO authenticated
  USING (funnel_instance_id IN (SELECT id FROM public.funnel_instances));

-- Funnel Events (tracking)
CREATE TABLE public.funnel_instance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_instance_id uuid REFERENCES public.funnel_instances(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid,
  session_id text,
  event_name text NOT NULL,
  source text,
  value numeric,
  metadata_json jsonb DEFAULT '{}',
  occurred_at timestamptz DEFAULT now()
);
ALTER TABLE public.funnel_instance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funnel_events_workspace" ON public.funnel_instance_events FOR ALL TO authenticated
  USING (funnel_instance_id IN (SELECT id FROM public.funnel_instances));

-- Revenue Events
CREATE TABLE public.funnel_revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_instance_id uuid REFERENCES public.funnel_instances(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid,
  source_event_id uuid REFERENCES public.funnel_instance_events(id) ON DELETE SET NULL,
  revenue_type text NOT NULL DEFAULT 'one_time',
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'EUR',
  metadata_json jsonb DEFAULT '{}',
  occurred_at timestamptz DEFAULT now()
);
ALTER TABLE public.funnel_revenue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revenue_events_workspace" ON public.funnel_revenue_events FOR ALL TO authenticated
  USING (funnel_instance_id IN (SELECT id FROM public.funnel_instances));

-- Custom Domains
CREATE TABLE public.custom_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  domain text NOT NULL,
  subdomain text,
  root_domain text,
  verification_status text NOT NULL DEFAULT 'pending',
  ssl_status text NOT NULL DEFAULT 'pending',
  provider text,
  dns_instructions_json jsonb DEFAULT '{}',
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_domains_workspace" ON public.custom_domains FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces));

-- Funnel Domain Bindings
CREATE TABLE public.funnel_domain_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_instance_id uuid REFERENCES public.funnel_instances(id) ON DELETE CASCADE NOT NULL,
  custom_domain_id uuid REFERENCES public.custom_domains(id) ON DELETE CASCADE NOT NULL,
  path text DEFAULT '/',
  is_primary boolean DEFAULT false,
  canonical_url text,
  redirect_www_mode text DEFAULT 'none',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.funnel_domain_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "domain_bindings_workspace" ON public.funnel_domain_bindings FOR ALL TO authenticated
  USING (funnel_instance_id IN (SELECT id FROM public.funnel_instances));

-- AI Funnel Sessions
CREATE TABLE public.ai_funnel_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  mode text NOT NULL DEFAULT 'chat',
  user_prompt text,
  parsed_brief_json jsonb DEFAULT '{}',
  ai_recommendation_json jsonb DEFAULT '{}',
  selected_configuration_json jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_funnel_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_funnel_sessions_workspace" ON public.ai_funnel_sessions FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces));

-- Add FK for funnel_instances.primary_domain_id
ALTER TABLE public.funnel_instances
  ADD CONSTRAINT funnel_instances_primary_domain_fkey
  FOREIGN KEY (primary_domain_id) REFERENCES public.custom_domains(id) ON DELETE SET NULL;
