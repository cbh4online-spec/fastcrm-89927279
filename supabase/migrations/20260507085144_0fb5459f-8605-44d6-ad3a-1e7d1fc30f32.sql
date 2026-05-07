
-- ===== EXTEND proposals =====
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS acceptance_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS acceptance_metadata jsonb DEFAULT '{}'::jsonb;

-- ===== sales_proposal_acceptances =====
CREATE TABLE IF NOT EXISTS public.sales_proposal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  proposal_id uuid NOT NULL,
  opportunity_id uuid,
  sales_request_id uuid,
  contact_id uuid,
  company_id uuid,
  acceptance_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'),
  status text NOT NULL DEFAULT 'started',
  accepted_by_name text,
  accepted_by_email text,
  accepted_by_phone text,
  accepted_by_role text,
  company_name text,
  company_tax_id text,
  company_address text,
  accepted_terms boolean DEFAULT false,
  accepted_privacy boolean DEFAULT false,
  acceptance_notes text,
  requested_changes text,
  change_type text,
  rejection_reason text,
  rejection_category text,
  ip_hash text,
  user_agent text,
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_spa_proposal ON public.sales_proposal_acceptances(proposal_id);
CREATE INDEX IF NOT EXISTS idx_spa_workspace ON public.sales_proposal_acceptances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_spa_status ON public.sales_proposal_acceptances(status);

ALTER TABLE public.sales_proposal_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spa_member_select" ON public.sales_proposal_acceptances FOR SELECT
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "spa_member_write" ON public.sales_proposal_acceptances FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "spa_service_insert" ON public.sales_proposal_acceptances FOR INSERT
  TO service_role WITH CHECK (true);

-- ===== customer_onboarding_projects =====
CREATE TABLE IF NOT EXISTS public.customer_onboarding_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  internal_workspace_id uuid,
  proposal_id uuid,
  acceptance_id uuid,
  opportunity_id uuid,
  sales_request_id uuid,
  contact_id uuid,
  company_id uuid,
  plan_id uuid,
  package_id uuid,
  assigned_project_manager uuid,
  onboarding_token text UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  title text NOT NULL,
  status text DEFAULT 'not_started',
  priority text DEFAULT 'medium',
  kickoff_date timestamptz,
  target_go_live_date date,
  completed_at timestamptz,
  customer_company_name text,
  customer_contact_name text,
  customer_contact_email text,
  customer_contact_phone text,
  implementation_scope jsonb DEFAULT '{}'::jsonb,
  selected_modules jsonb DEFAULT '[]'::jsonb,
  onboarding_summary text,
  internal_notes text,
  progress_pct integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_cop_workspace ON public.customer_onboarding_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cop_status ON public.customer_onboarding_projects(status);
CREATE INDEX IF NOT EXISTS idx_cop_proposal ON public.customer_onboarding_projects(proposal_id);

ALTER TABLE public.customer_onboarding_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cop_member_select" ON public.customer_onboarding_projects FOR SELECT
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "cop_member_write" ON public.customer_onboarding_projects FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "cop_service_all" ON public.customer_onboarding_projects FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ===== onboarding_checklist_templates =====
CREATE TABLE IF NOT EXISTS public.onboarding_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  package_id uuid,
  plan_id uuid,
  vertical text,
  active boolean DEFAULT true,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.onboarding_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oct_authenticated_select" ON public.onboarding_checklist_templates FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "oct_admin_write" ON public.onboarding_checklist_templates FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ===== customer_onboarding_checklist_items =====
CREATE TABLE IF NOT EXISTS public.customer_onboarding_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  onboarding_project_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  field_type text DEFAULT 'text',
  required boolean DEFAULT false,
  visible_to_customer boolean DEFAULT true,
  status text DEFAULT 'pending',
  assigned_to_customer boolean DEFAULT false,
  assigned_to_internal uuid,
  due_at timestamptz,
  response_value text,
  response_json jsonb DEFAULT '{}'::jsonb,
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  sort_order integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coci_project ON public.customer_onboarding_checklist_items(onboarding_project_id);
ALTER TABLE public.customer_onboarding_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coci_member_select" ON public.customer_onboarding_checklist_items FOR SELECT
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "coci_member_write" ON public.customer_onboarding_checklist_items FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "coci_service_all" ON public.customer_onboarding_checklist_items FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ===== customer_onboarding_documents =====
CREATE TABLE IF NOT EXISTS public.customer_onboarding_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  onboarding_project_id uuid NOT NULL,
  uploaded_by_contact_id uuid,
  uploaded_by_user_id uuid,
  document_type text,
  title text NOT NULL,
  description text,
  file_name text,
  file_url text,
  storage_path text,
  mime_type text,
  file_size_bytes integer,
  status text DEFAULT 'uploaded',
  visible_to_customer boolean DEFAULT true,
  internal_only boolean DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_cod_project ON public.customer_onboarding_documents(onboarding_project_id);
ALTER TABLE public.customer_onboarding_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cod_member_select" ON public.customer_onboarding_documents FOR SELECT
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "cod_member_write" ON public.customer_onboarding_documents FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "cod_service_all" ON public.customer_onboarding_documents FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ===== customer_onboarding_events =====
CREATE TABLE IF NOT EXISTS public.customer_onboarding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  onboarding_project_id uuid NOT NULL,
  event_type text NOT NULL,
  user_id uuid,
  contact_id uuid,
  description text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coe_project ON public.customer_onboarding_events(onboarding_project_id);
ALTER TABLE public.customer_onboarding_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coe_member_select" ON public.customer_onboarding_events FOR SELECT
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "coe_service_insert" ON public.customer_onboarding_events FOR INSERT
  TO service_role WITH CHECK (true);
CREATE POLICY "coe_member_insert" ON public.customer_onboarding_events FOR INSERT
  TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- ===== customer_portal_sessions =====
CREATE TABLE IF NOT EXISTS public.customer_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid,
  onboarding_project_id uuid,
  token text NOT NULL,
  contact_email text,
  ip_hash text,
  user_agent text,
  event_type text,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_cps_token ON public.customer_portal_sessions(token);
ALTER TABLE public.customer_portal_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cps_admin_select" ON public.customer_portal_sessions FOR SELECT
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "cps_service_insert" ON public.customer_portal_sessions FOR INSERT
  TO service_role WITH CHECK (true);

-- ===== onboarding_internal_tasks =====
CREATE TABLE IF NOT EXISTS public.onboarding_internal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_project_id uuid NOT NULL,
  workspace_id uuid,
  title text NOT NULL,
  description text,
  assigned_to uuid,
  status text DEFAULT 'open',
  priority text DEFAULT 'medium',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oit_project ON public.onboarding_internal_tasks(onboarding_project_id);
ALTER TABLE public.onboarding_internal_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oit_member_select" ON public.onboarding_internal_tasks FOR SELECT
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "oit_member_write" ON public.onboarding_internal_tasks FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "oit_service_all" ON public.onboarding_internal_tasks FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ===== onboarding_blockers =====
CREATE TABLE IF NOT EXISTS public.onboarding_blockers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_project_id uuid NOT NULL,
  workspace_id uuid,
  title text NOT NULL,
  description text,
  blocker_type text DEFAULT 'other',
  status text DEFAULT 'open',
  assigned_to uuid,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ob_project ON public.onboarding_blockers(onboarding_project_id);
ALTER TABLE public.onboarding_blockers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ob_member_select" ON public.onboarding_blockers FOR SELECT
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "ob_member_write" ON public.onboarding_blockers FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- ===== updated_at triggers =====
CREATE TRIGGER trg_spa_updated BEFORE UPDATE ON public.sales_proposal_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cop_updated BEFORE UPDATE ON public.customer_onboarding_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_oct_updated BEFORE UPDATE ON public.onboarding_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_coci_updated BEFORE UPDATE ON public.customer_onboarding_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cod_updated BEFORE UPDATE ON public.customer_onboarding_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_oit_updated BEFORE UPDATE ON public.onboarding_internal_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
