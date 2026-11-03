-- Cursos
ALTER TABLE public.sj_courses
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS trainer_names text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS previous_course_id uuid REFERENCES public.sj_courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_course_id uuid REFERENCES public.sj_courses(id) ON DELETE SET NULL;

-- Edições
ALTER TABLE public.sj_cohorts
  ADD COLUMN IF NOT EXISTS edition_code text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS trainer_name text,
  ADD COLUMN IF NOT EXISTS reserved_seats integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price numeric(12,2),
  ADD COLUMN IF NOT EXISTS edition_status text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS dates_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE public.sj_cohorts DROP CONSTRAINT IF EXISTS sj_cohorts_edition_status_chk;
ALTER TABLE public.sj_cohorts ADD CONSTRAINT sj_cohorts_edition_status_chk
  CHECK (edition_status IN ('planned','provisional','confirmed','in_progress','completed','cancelled'));
ALTER TABLE public.sj_cohorts DROP CONSTRAINT IF EXISTS sj_cohorts_reserved_chk;
ALTER TABLE public.sj_cohorts ADD CONSTRAINT sj_cohorts_reserved_chk CHECK (reserved_seats >= 0);

-- Inscrições: estados separados
ALTER TABLE public.sj_enrollments
  ADD COLUMN IF NOT EXISTS admin_status text,
  ADD COLUMN IF NOT EXISTS pedagogic_status text,
  ADD COLUMN IF NOT EXISTS financial_status text,
  ADD COLUMN IF NOT EXISTS base_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agreed_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid,
  ADD COLUMN IF NOT EXISTS duplicate_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_approved_by uuid,
  ADD COLUMN IF NOT EXISTS import_source_file text,
  ADD COLUMN IF NOT EXISTS import_source_sheet text,
  ADD COLUMN IF NOT EXISTS import_source_row text;

UPDATE public.sj_enrollments SET
  admin_status = COALESCE(admin_status, CASE status WHEN 'invited' THEN 'submitted' WHEN 'completed' THEN 'admin_completed' ELSE 'confirmed' END),
  pedagogic_status = COALESCE(pedagogic_status, CASE status WHEN 'active' THEN 'in_training' WHEN 'completed' THEN 'completed' ELSE 'not_started' END),
  financial_status = COALESCE(financial_status, CASE payment_status WHEN 'paid' THEN 'paid' ELSE 'unpaid' END);

ALTER TABLE public.sj_enrollments ALTER COLUMN admin_status SET DEFAULT 'draft';
ALTER TABLE public.sj_enrollments ALTER COLUMN pedagogic_status SET DEFAULT 'not_started';
ALTER TABLE public.sj_enrollments ALTER COLUMN financial_status SET DEFAULT 'unpaid';
ALTER TABLE public.sj_enrollments ADD CONSTRAINT sj_enr_admin_chk CHECK (admin_status IS NULL OR admin_status IN ('draft','submitted','pending_documents','pending_payment','confirmed','waitlist','cancelled','admin_completed'));
ALTER TABLE public.sj_enrollments ADD CONSTRAINT sj_enr_ped_chk CHECK (pedagogic_status IS NULL OR pedagogic_status IN ('not_started','in_training','completed','not_completed','withdrawn'));
ALTER TABLE public.sj_enrollments ADD CONSTRAINT sj_enr_fin_chk CHECK (financial_status IS NULL OR financial_status IN ('unpaid','partial','paid','overdue','refunded','waived'));
ALTER TABLE public.sj_enrollments ADD CONSTRAINT sj_enr_amount_chk CHECK (discount_amount >= 0);
COMMENT ON COLUMN public.sj_enrollments.status IS 'DEPRECATED: replaced by admin_status/pedagogic_status';
COMMENT ON COLUMN public.sj_enrollments.payment_status IS 'DEPRECATED: replaced by financial_status';

CREATE UNIQUE INDEX IF NOT EXISTS sj_enrollments_unique_cohort
  ON public.sj_enrollments (workspace_id, profile_id, cohort_id)
  WHERE cohort_id IS NOT NULL AND duplicate_approved = false;

-- Função de papéis da Jornada
CREATE OR REPLACE FUNCTION public.sj_has_any_role(_workspace_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=_workspace_id AND wm.user_id=auth.uid() AND wm.role IN ('owner','admin'))
    OR EXISTS (SELECT 1 FROM sj_permissions p WHERE p.workspace_id=_workspace_id AND p.user_id=auth.uid() AND p.role = ANY(_roles))
$$;

-- Presenças
CREATE TABLE public.sj_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  enrollment_id uuid NOT NULL REFERENCES public.sj_enrollments(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES public.sj_course_phases(id) ON DELETE SET NULL,
  session_date date NOT NULL,
  present boolean NOT NULL DEFAULT true,
  hours_attended numeric(5,2) NOT NULL DEFAULT 0 CHECK (hours_attended >= 0),
  notes text,
  recorded_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, session_date, phase_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sj_attendance TO authenticated;
GRANT ALL ON public.sj_attendance TO service_role;
ALTER TABLE public.sj_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY sj_attendance_select ON public.sj_attendance FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) OR (SELECT is_super_admin(auth.uid())));
CREATE POLICY sj_attendance_write ON public.sj_attendance FOR ALL TO authenticated
  USING (public.sj_has_any_role(workspace_id, ARRAY['gestao','administrativo','formador']))
  WITH CHECK (public.sj_has_any_role(workspace_id, ARRAY['gestao','administrativo','formador']));

-- Certificados
CREATE TABLE public.sj_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  enrollment_id uuid NOT NULL REFERENCES public.sj_enrollments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','issued','revoked')),
  evaluation text,
  issued_at date,
  document_url text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sj_certificates TO authenticated;
GRANT ALL ON public.sj_certificates TO service_role;
ALTER TABLE public.sj_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY sj_certificates_select ON public.sj_certificates FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) OR (SELECT is_super_admin(auth.uid())));
CREATE POLICY sj_certificates_write ON public.sj_certificates FOR ALL TO authenticated
  USING (public.sj_has_any_role(workspace_id, ARRAY['gestao','administrativo']))
  WITH CHECK (public.sj_has_any_role(workspace_id, ARRAY['gestao','administrativo']));

-- Prestações (dados financeiros: só gestão/financeiro)
CREATE TABLE public.sj_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  enrollment_id uuid NOT NULL REFERENCES public.sj_enrollments(id) ON DELETE CASCADE,
  installment_no integer NOT NULL CHECK (installment_no > 0),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  due_date date NOT NULL,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  paid_at date,
  invoice_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, installment_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sj_installments TO authenticated;
GRANT ALL ON public.sj_installments TO service_role;
ALTER TABLE public.sj_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY sj_installments_all ON public.sj_installments FOR ALL TO authenticated
  USING (public.sj_has_any_role(workspace_id, ARRAY['gestao','financeiro']))
  WITH CHECK (public.sj_has_any_role(workspace_id, ARRAY['gestao','financeiro']));

-- Ligação inscrição ↔ documentos financeiros
CREATE TABLE public.sj_enrollment_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  enrollment_id uuid NOT NULL REFERENCES public.sj_enrollments(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL,
  allocated_amount numeric(12,2) CHECK (allocated_amount IS NULL OR allocated_amount >= 0),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, invoice_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sj_enrollment_invoices TO authenticated;
GRANT ALL ON public.sj_enrollment_invoices TO service_role;
ALTER TABLE public.sj_enrollment_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY sj_enr_inv_all ON public.sj_enrollment_invoices FOR ALL TO authenticated
  USING (public.sj_has_any_role(workspace_id, ARRAY['gestao','financeiro']))
  WITH CHECK (public.sj_has_any_role(workspace_id, ARRAY['gestao','financeiro']));

-- Guarda: mesmo workspace nas tabelas filhas
CREATE OR REPLACE FUNCTION public.sj_child_workspace_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  SELECT workspace_id INTO ws FROM sj_enrollments WHERE id = NEW.enrollment_id;
  IF ws IS NULL OR ws <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Inscrição pertence a outro workspace';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sj_attendance_ws BEFORE INSERT OR UPDATE ON public.sj_attendance FOR EACH ROW EXECUTE FUNCTION public.sj_child_workspace_guard();
CREATE TRIGGER sj_certificates_ws BEFORE INSERT OR UPDATE ON public.sj_certificates FOR EACH ROW EXECUTE FUNCTION public.sj_child_workspace_guard();
CREATE TRIGGER sj_installments_ws BEFORE INSERT OR UPDATE ON public.sj_installments FOR EACH ROW EXECUTE FUNCTION public.sj_child_workspace_guard();
CREATE TRIGGER sj_enr_inv_ws BEFORE INSERT OR UPDATE ON public.sj_enrollment_invoices FOR EACH ROW EXECUTE FUNCTION public.sj_child_workspace_guard();

-- Conclusão pedagógica só com presenças registadas
CREATE OR REPLACE FUNCTION public.sj_completion_requires_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.pedagogic_status = 'completed' AND (OLD.pedagogic_status IS DISTINCT FROM 'completed')
     AND NOT EXISTS (SELECT 1 FROM sj_attendance a WHERE a.enrollment_id = NEW.id AND a.present) THEN
    RAISE EXCEPTION 'Não é possível concluir a formação sem presenças registadas';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sj_enr_completion_guard BEFORE UPDATE OF pedagogic_status ON public.sj_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.sj_completion_requires_attendance();