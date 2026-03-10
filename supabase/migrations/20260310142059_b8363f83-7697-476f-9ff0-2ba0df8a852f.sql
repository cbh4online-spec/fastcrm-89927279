
-- =============================================
-- FASTCRM SECURITY OPS — ALL DOMAIN TABLES
-- =============================================

-- 1. security_partners
CREATE TABLE public.security_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  partner_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  origin_channel_default TEXT DEFAULT 'manual',
  zone TEXT,
  notes TEXT,
  default_contact_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
ALTER TABLE public.security_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_partners in their workspace" ON public.security_partners FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

-- 2. security_partner_requests
CREATE TABLE public.security_partner_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.security_partners(id),
  source_channel TEXT NOT NULL DEFAULT 'manual',
  raw_text TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending',
  extraction_confidence NUMERIC(5,2),
  parsed_payload_json JSONB DEFAULT '{}',
  missing_fields_json JSONB DEFAULT '[]',
  linked_lead_id UUID,
  linked_opportunity_id UUID,
  linked_company_id UUID,
  linked_site_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
ALTER TABLE public.security_partner_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_partner_requests in workspace" ON public.security_partner_requests FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 3. security_installation_sites
CREATE TABLE public.security_installation_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID,
  contact_id UUID,
  partner_id UUID REFERENCES public.security_partners(id),
  site_name TEXT NOT NULL,
  address_line_1 TEXT,
  address_line_2 TEXT,
  postal_code TEXT,
  locality TEXT,
  county TEXT,
  district TEXT,
  country TEXT DEFAULT 'Portugal',
  establishment_type TEXT,
  access_notes TEXT,
  onsite_responsible_name TEXT,
  onsite_responsible_phone TEXT,
  onsite_responsible_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_installation_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_installation_sites in workspace" ON public.security_installation_sites FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 4. security_systems
CREATE TABLE public.security_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.security_installation_sites(id),
  opportunity_id UUID,
  proposal_id UUID,
  contract_id UUID,
  system_type TEXT NOT NULL DEFAULT 'cctv',
  lifecycle_type TEXT NOT NULL DEFAULT 'new_installation',
  status TEXT NOT NULL DEFAULT 'draft',
  installation_date DATE,
  commissioning_date DATE,
  installer_company_name TEXT,
  maintenance_company_name TEXT,
  lead_technician_id UUID,
  installer_technician_id UUID,
  main_brand TEXT,
  main_model TEXT,
  integration_notes TEXT,
  protected_zones_summary TEXT,
  technical_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_systems in workspace" ON public.security_systems FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 5. security_system_zones
CREATE TABLE public.security_system_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.security_systems(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  zone_type TEXT,
  sort_order INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_system_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_system_zones in workspace" ON public.security_system_zones FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 6. security_equipment_catalog
CREATE TABLE public.security_equipment_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  reference TEXT,
  category TEXT NOT NULL DEFAULT 'camera',
  subtype TEXT,
  technical_specs_json JSONB DEFAULT '{}',
  compatibility_notes TEXT,
  datasheet_file_id UUID,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_equipment_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_equipment_catalog in workspace" ON public.security_equipment_catalog FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 7. security_installed_devices
CREATE TABLE public.security_installed_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES public.security_systems(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES public.security_system_zones(id),
  catalog_item_id UUID REFERENCES public.security_equipment_catalog(id),
  device_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  reference TEXT,
  serial_number TEXT,
  quantity INT DEFAULT 1,
  location_description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_installed_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_installed_devices in workspace" ON public.security_installed_devices FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 8. security_contracts
CREATE TABLE public.security_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  system_id UUID REFERENCES public.security_systems(id),
  company_id UUID,
  contact_id UUID,
  contract_type TEXT NOT NULL DEFAULT 'installation',
  contract_status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  renewal_notice_days INT DEFAULT 90,
  sla_json JSONB DEFAULT '{}',
  commercial_terms_json JSONB DEFAULT '{}',
  signed_document_file_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_contracts in workspace" ON public.security_contracts FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 9. security_documents
CREATE TABLE public.security_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  system_id UUID REFERENCES public.security_systems(id),
  site_id UUID REFERENCES public.security_installation_sites(id),
  contract_id UUID REFERENCES public.security_contracts(id),
  document_type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'draft',
  template_key TEXT,
  version_number INT DEFAULT 1,
  source_data_json JSONB DEFAULT '{}',
  rendered_file_id UUID,
  preview_file_id UUID,
  signed_file_id UUID,
  validation_notes TEXT,
  emitted_at TIMESTAMPTZ,
  emitted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_documents in workspace" ON public.security_documents FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 10. security_maintenance_plans
CREATE TABLE public.security_maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.security_contracts(id),
  system_id UUID REFERENCES public.security_systems(id),
  frequency_type TEXT NOT NULL DEFAULT 'quarterly',
  frequency_value INT DEFAULT 3,
  sla_json JSONB DEFAULT '{}',
  next_visit_at TIMESTAMPTZ,
  responsible_team_id UUID,
  checklist_template_json JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_maintenance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_maintenance_plans in workspace" ON public.security_maintenance_plans FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 11. security_maintenance_visits
CREATE TABLE public.security_maintenance_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  maintenance_plan_id UUID REFERENCES public.security_maintenance_plans(id),
  system_id UUID REFERENCES public.security_systems(id),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  technician_id UUID,
  visit_status TEXT NOT NULL DEFAULT 'scheduled',
  checklist_result_json JSONB DEFAULT '[]',
  photos_json JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_maintenance_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_maintenance_visits in workspace" ON public.security_maintenance_visits FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 12. security_occurrences
CREATE TABLE public.security_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  system_id UUID REFERENCES public.security_systems(id),
  site_id UUID REFERENCES public.security_installation_sites(id),
  maintenance_visit_id UUID REFERENCES public.security_maintenance_visits(id),
  occurrence_type TEXT NOT NULL DEFAULT 'fault',
  occurrence_origin TEXT NOT NULL DEFAULT 'client',
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  occurred_at TIMESTAMPTZ DEFAULT now(),
  zone_id UUID REFERENCES public.security_system_zones(id),
  installed_device_id UUID REFERENCES public.security_installed_devices(id),
  title TEXT NOT NULL,
  description TEXT,
  impact_on_client TEXT,
  resolution_summary TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_occurrences in workspace" ON public.security_occurrences FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 13. security_renewals
CREATE TABLE public.security_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.security_contracts(id),
  system_id UUID REFERENCES public.security_systems(id),
  renewal_stage TEXT NOT NULL DEFAULT 'upcoming_90',
  renewal_due_date DATE,
  renewal_proposal_id UUID,
  owner_user_id UUID,
  result_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage security_renewals in workspace" ON public.security_renewals FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- 14. security_audit_events
CREATE TABLE public.security_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  previous_state_json JSONB,
  new_state_json JSONB,
  source TEXT DEFAULT 'user',
  user_id UUID,
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read security_audit_events in workspace" ON public.security_audit_events FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Users can insert security_audit_events in workspace" ON public.security_audit_events FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_security_partner_requests_workspace ON public.security_partner_requests(workspace_id);
CREATE INDEX idx_security_partner_requests_partner ON public.security_partner_requests(partner_id);
CREATE INDEX idx_security_partner_requests_status ON public.security_partner_requests(extraction_status);
CREATE INDEX idx_security_systems_workspace ON public.security_systems(workspace_id);
CREATE INDEX idx_security_systems_site ON public.security_systems(site_id);
CREATE INDEX idx_security_contracts_workspace ON public.security_contracts(workspace_id);
CREATE INDEX idx_security_occurrences_workspace ON public.security_occurrences(workspace_id);
CREATE INDEX idx_security_occurrences_system ON public.security_occurrences(system_id);
CREATE INDEX idx_security_renewals_workspace ON public.security_renewals(workspace_id);
CREATE INDEX idx_security_audit_events_workspace ON public.security_audit_events(workspace_id);
CREATE INDEX idx_security_audit_events_entity ON public.security_audit_events(entity_type, entity_id);
CREATE INDEX idx_security_maintenance_visits_workspace ON public.security_maintenance_visits(workspace_id);
CREATE INDEX idx_security_installed_devices_system ON public.security_installed_devices(system_id);
