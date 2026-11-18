CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true),'')::uuid $$;
CREATE TABLE workspaces (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL);
CREATE TABLE workspace_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid, user_id uuid, role text);
CREATE TABLE sj_permissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid, user_id uuid, role text);
CREATE TABLE profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
CREATE TABLE user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, role text);
CREATE FUNCTION is_super_admin(_u uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN profiles p ON p.id=ur.user_id WHERE p.user_id=_u AND ur.role='super_admin') $$;
CREATE FUNCTION get_user_workspace_ids() RETURNS SETOF uuid LANGUAGE sql STABLE AS $$ SELECT workspace_id FROM workspace_members WHERE user_id=auth.uid() $$;
CREATE FUNCTION sj_has_any_role(_workspace_id uuid, _roles text[]) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=_workspace_id AND wm.user_id=auth.uid() AND wm.role IN ('owner','admin'))
    OR EXISTS (SELECT 1 FROM sj_permissions p WHERE p.workspace_id=_workspace_id AND p.user_id=auth.uid() AND p.role = ANY(_roles)) $$;
CREATE TABLE contacts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, created_by uuid NOT NULL, name text NOT NULL,
  email text, phone text, tax_id text, client_number text, source text, lead_source text, entity_type text, deleted_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE sj_courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, name text NOT NULL);
CREATE TABLE sj_cohorts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, course_id uuid NOT NULL REFERENCES sj_courses(id), name text NOT NULL);
CREATE TABLE sj_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  full_name text NOT NULL, email text, phone text, lifecycle_stage text NOT NULL DEFAULT 'lead', total_courses_completed int DEFAULT 0,
  last_course_completed_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), UNIQUE (workspace_id, contact_id));
CREATE TABLE sj_enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, profile_id uuid NOT NULL REFERENCES sj_profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES sj_courses(id), cohort_id uuid REFERENCES sj_cohorts(id), status text NOT NULL DEFAULT 'interested',
  completed_at timestamptz, payment_status text NOT NULL DEFAULT 'unpaid', source text NOT NULL DEFAULT 'manual', notes text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), admin_status text DEFAULT 'draft', pedagogic_status text DEFAULT 'not_started',
  financial_status text DEFAULT 'unpaid', base_amount numeric, discount_amount numeric NOT NULL DEFAULT 0, agreed_amount numeric,
  duplicate_approved boolean NOT NULL DEFAULT false, import_source_file text, import_source_sheet text, import_source_row text,
  CONSTRAINT sj_enrollments_payment_check CHECK (payment_status = ANY (ARRAY['unpaid','paid','partial','refunded'])),
  CONSTRAINT sj_enrollments_unique UNIQUE (profile_id, course_id, cohort_id));
CREATE TABLE sj_import_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, source text NOT NULL, status text, file_name text,
  mapping_config jsonb, results_summary jsonb, total_rows int, processed_rows int, success_count int, error_count int, skipped_count int, errors jsonb,
  started_at timestamptz, completed_at timestamptz, created_by uuid);
CREATE TABLE sj_attendance (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid REFERENCES sj_enrollments(id) ON DELETE CASCADE, present boolean);
CREATE TABLE sj_certificates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid UNIQUE REFERENCES sj_enrollments(id) ON DELETE CASCADE);
CREATE TABLE sj_installments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid REFERENCES sj_enrollments(id) ON DELETE CASCADE);
CREATE TABLE sj_enrollment_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid REFERENCES sj_enrollments(id) ON DELETE CASCADE);
CREATE TABLE sj_enrollment_invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid REFERENCES sj_enrollments(id) ON DELETE CASCADE);
CREATE TABLE sj_touchpoints (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid, profile_id uuid REFERENCES sj_profiles(id) ON DELETE CASCADE);
CREATE TABLE sj_tasks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid, profile_id uuid REFERENCES sj_profiles(id) ON DELETE CASCADE);
CREATE TABLE sj_automation_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid, profile_id uuid REFERENCES sj_profiles(id) ON DELETE SET NULL);
CREATE TABLE sj_ai_suggestions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid, profile_id uuid REFERENCES sj_profiles(id) ON DELETE CASCADE);
CREATE TABLE sj_course_recommendations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid, profile_id uuid REFERENCES sj_profiles(id) ON DELETE CASCADE);
CREATE FUNCTION sj_completion_requires_attendance() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER sj_enr_completion_guard BEFORE INSERT OR UPDATE ON sj_enrollments FOR EACH ROW EXECUTE FUNCTION sj_completion_requires_attendance();
CREATE FUNCTION sj_import_historical_rows(_workspace_id uuid, _cohort_id uuid, _dedupe_key text, _rows jsonb, _file_name text DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
-- trigger original instalado (usa now() e muda o estado sem olhar a outras inscrições); 0143 substitui-o
CREATE FUNCTION update_sj_profile_course_stats() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE sj_profiles SET total_courses_completed = COALESCE(total_courses_completed,0)+1,
      last_course_completed_at = COALESCE(NEW.completed_at, now()),
      lifecycle_stage = CASE WHEN lifecycle_stage IN ('active','enrolled') THEN 'completed' ELSE lifecycle_stage END
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trigger_update_profile_course_stats AFTER INSERT OR UPDATE ON sj_enrollments FOR EACH ROW EXECUTE FUNCTION update_sj_profile_course_stats();
