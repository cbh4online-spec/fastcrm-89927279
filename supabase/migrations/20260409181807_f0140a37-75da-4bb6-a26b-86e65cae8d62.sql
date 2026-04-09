
-- Profile menu permissions
CREATE TABLE public.profile_menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_function TEXT NOT NULL,
  menu_key TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sales_function, menu_key)
);

ALTER TABLE public.profile_menu_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profile menu permissions"
  ON public.profile_menu_permissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Super admins can manage profile menu permissions"
  ON public.profile_menu_permissions FOR ALL
  TO authenticated USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Profile field permissions
CREATE TABLE public.profile_field_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_function TEXT NOT NULL,
  page_key TEXT NOT NULL,
  field_key TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sales_function, page_key, field_key)
);

ALTER TABLE public.profile_field_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profile field permissions"
  ON public.profile_field_permissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Super admins can manage profile field permissions"
  ON public.profile_field_permissions FOR ALL
  TO authenticated USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_profile_menu_permissions_updated_at
  BEFORE UPDATE ON public.profile_menu_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profile_field_permissions_updated_at
  BEFORE UPDATE ON public.profile_field_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: menu defaults per sales_function
-- All menus for reference: dashboard, feed, productivity, inbox, crm, leads, contacts, companies, pipeline, proposals, invoices, products, marketing, automations, reports, calendar, settings, team, integrations

INSERT INTO public.profile_menu_permissions (sales_function, menu_key, visible) VALUES
  -- Vendedor: foco operacional
  ('vendedor', 'dashboard', true),
  ('vendedor', 'feed', true),
  ('vendedor', 'productivity', true),
  ('vendedor', 'inbox', true),
  ('vendedor', 'crm', true),
  ('vendedor', 'leads', true),
  ('vendedor', 'contacts', true),
  ('vendedor', 'companies', true),
  ('vendedor', 'pipeline', true),
  ('vendedor', 'proposals', true),
  ('vendedor', 'invoices', false),
  ('vendedor', 'products', true),
  ('vendedor', 'marketing', false),
  ('vendedor', 'automations', false),
  ('vendedor', 'reports', false),
  ('vendedor', 'calendar', true),
  ('vendedor', 'settings', false),
  ('vendedor', 'team', false),
  ('vendedor', 'integrations', false),
  -- Gestor: tudo visível
  ('gestor', 'dashboard', true),
  ('gestor', 'feed', true),
  ('gestor', 'productivity', true),
  ('gestor', 'inbox', true),
  ('gestor', 'crm', true),
  ('gestor', 'leads', true),
  ('gestor', 'contacts', true),
  ('gestor', 'companies', true),
  ('gestor', 'pipeline', true),
  ('gestor', 'proposals', true),
  ('gestor', 'invoices', true),
  ('gestor', 'products', true),
  ('gestor', 'marketing', true),
  ('gestor', 'automations', true),
  ('gestor', 'reports', true),
  ('gestor', 'calendar', true),
  ('gestor', 'settings', true),
  ('gestor', 'team', true),
  ('gestor', 'integrations', true),
  -- Diretor: foco estratégico
  ('diretor', 'dashboard', true),
  ('diretor', 'feed', true),
  ('diretor', 'productivity', false),
  ('diretor', 'inbox', true),
  ('diretor', 'crm', true),
  ('diretor', 'leads', true),
  ('diretor', 'contacts', true),
  ('diretor', 'companies', true),
  ('diretor', 'pipeline', true),
  ('diretor', 'proposals', true),
  ('diretor', 'invoices', true),
  ('diretor', 'products', true),
  ('diretor', 'marketing', true),
  ('diretor', 'automations', true),
  ('diretor', 'reports', true),
  ('diretor', 'calendar', true),
  ('diretor', 'settings', true),
  ('diretor', 'team', true),
  ('diretor', 'integrations', true),
  -- CEO: visão geral
  ('ceo', 'dashboard', true),
  ('ceo', 'feed', true),
  ('ceo', 'productivity', false),
  ('ceo', 'inbox', false),
  ('ceo', 'crm', true),
  ('ceo', 'leads', false),
  ('ceo', 'contacts', false),
  ('ceo', 'companies', true),
  ('ceo', 'pipeline', true),
  ('ceo', 'proposals', false),
  ('ceo', 'invoices', true),
  ('ceo', 'products', false),
  ('ceo', 'marketing', true),
  ('ceo', 'automations', false),
  ('ceo', 'reports', true),
  ('ceo', 'calendar', false),
  ('ceo', 'settings', true),
  ('ceo', 'team', true),
  ('ceo', 'integrations', false);

-- Seed: field defaults (some examples)
INSERT INTO public.profile_field_permissions (sales_function, page_key, field_key, visible) VALUES
  ('vendedor', 'pipeline', 'margin', false),
  ('vendedor', 'pipeline', 'cost', false),
  ('vendedor', 'pipeline', 'commission', true),
  ('vendedor', 'leads', 'source_cost', false),
  ('gestor', 'pipeline', 'margin', true),
  ('gestor', 'pipeline', 'cost', true),
  ('gestor', 'pipeline', 'commission', true),
  ('gestor', 'leads', 'source_cost', true),
  ('diretor', 'pipeline', 'margin', true),
  ('diretor', 'pipeline', 'cost', true),
  ('diretor', 'pipeline', 'commission', true),
  ('diretor', 'leads', 'source_cost', true),
  ('ceo', 'pipeline', 'margin', true),
  ('ceo', 'pipeline', 'cost', false),
  ('ceo', 'pipeline', 'commission', false),
  ('ceo', 'leads', 'source_cost', false);
