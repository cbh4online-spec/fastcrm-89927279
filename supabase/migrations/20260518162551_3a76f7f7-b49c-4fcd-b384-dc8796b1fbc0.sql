
DO $$ BEGIN
  CREATE TYPE public.collection_case_status AS ENUM (
    'new','in_progress','promise','plan','paid','partially_paid','escalated','closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.collection_action_type AS ENUM (
    'email_sent','whatsapp_sent','sms_sent','call_logged','note',
    'promise_created','plan_created','payment_received','escalation','portal_view','system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.collection_channel AS ENUM ('email','whatsapp','sms','phone','portal','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_promise_status AS ENUM ('pending','kept','broken','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_plan_status AS ENUM ('active','completed','defaulted','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_installment_status AS ENUM ('pending','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. dunning_sequences
CREATE TABLE public.dunning_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  min_amount numeric(12,2),
  max_amount numeric(12,2),
  created_by uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cm_idx_dunning_sequences_ws ON public.dunning_sequences(workspace_id) WHERE deleted_at IS NULL;

-- 2. dunning_steps
CREATE TABLE public.dunning_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES public.dunning_sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  days_after_due integer NOT NULL,
  channel public.collection_channel NOT NULL,
  template_subject text,
  template_body text,
  action_type public.collection_action_type NOT NULL DEFAULT 'email_sent',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, step_order)
);
CREATE INDEX cm_idx_dunning_steps_seq ON public.dunning_steps(sequence_id);

-- 3. collection_cases
CREATE TABLE public.collection_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  debtor_type text NOT NULL CHECK (debtor_type IN ('company','contact')),
  company_id uuid,
  contact_id uuid,
  debtor_name text NOT NULL,
  debtor_email text,
  debtor_phone text,
  debtor_tax_id text,
  status public.collection_case_status NOT NULL DEFAULT 'new',
  total_due numeric(12,2) NOT NULL DEFAULT 0,
  total_paid numeric(12,2) NOT NULL DEFAULT 0,
  invoices_count integer NOT NULL DEFAULT 0,
  oldest_due_date date,
  days_overdue integer NOT NULL DEFAULT 0,
  sequence_id uuid REFERENCES public.dunning_sequences(id) ON DELETE SET NULL,
  current_step_order integer,
  next_action_at timestamptz,
  last_action_at timestamptz,
  assigned_to uuid,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  ai_risk_score numeric(5,2),
  ai_risk_label text,
  ai_last_scored_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  closed_at timestamptz,
  closed_reason text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((debtor_type = 'company' AND company_id IS NOT NULL) OR (debtor_type = 'contact' AND contact_id IS NOT NULL))
);
CREATE INDEX cm_idx_cases_ws_status ON public.collection_cases(workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX cm_idx_cases_assigned ON public.collection_cases(workspace_id, assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX cm_idx_cases_next_action ON public.collection_cases(workspace_id, next_action_at) WHERE deleted_at IS NULL AND next_action_at IS NOT NULL;
CREATE UNIQUE INDEX cm_uq_cases_company_open ON public.collection_cases(workspace_id, company_id)
  WHERE debtor_type='company' AND status NOT IN ('paid','closed') AND deleted_at IS NULL;
CREATE UNIQUE INDEX cm_uq_cases_contact_open ON public.collection_cases(workspace_id, contact_id)
  WHERE debtor_type='contact' AND status NOT IN ('paid','closed') AND deleted_at IS NULL;

-- 4. collection_case_invoices
CREATE TABLE public.collection_case_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.collection_cases(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  snapshot_total numeric(12,2) NOT NULL DEFAULT 0,
  snapshot_amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  snapshot_due_date date,
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  UNIQUE (case_id, invoice_id)
);
CREATE INDEX cm_idx_case_invoices_case ON public.collection_case_invoices(case_id) WHERE removed_at IS NULL;
CREATE INDEX cm_idx_case_invoices_invoice ON public.collection_case_invoices(invoice_id);

-- 5. collection_actions
CREATE TABLE public.collection_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.collection_cases(id) ON DELETE CASCADE,
  action_type public.collection_action_type NOT NULL,
  channel public.collection_channel,
  subject text,
  body text,
  step_id uuid REFERENCES public.dunning_steps(id) ON DELETE SET NULL,
  performed_by uuid,
  is_automated boolean NOT NULL DEFAULT false,
  outcome text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cm_idx_actions_case ON public.collection_actions(case_id, created_at DESC);
CREATE INDEX cm_idx_actions_ws ON public.collection_actions(workspace_id, created_at DESC);

-- 6. payment_promises
CREATE TABLE public.payment_promises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.collection_cases(id) ON DELETE CASCADE,
  promised_amount numeric(12,2) NOT NULL,
  promised_date date NOT NULL,
  status public.payment_promise_status NOT NULL DEFAULT 'pending',
  resolved_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cm_idx_promises_case ON public.payment_promises(case_id);
CREATE INDEX cm_idx_promises_pending ON public.payment_promises(workspace_id, promised_date) WHERE status='pending';

-- 7. payment_plans
CREATE TABLE public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.collection_cases(id) ON DELETE CASCADE,
  total_amount numeric(12,2) NOT NULL,
  installments_count integer NOT NULL CHECK (installments_count >= 1),
  first_installment_date date NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','biweekly','monthly')),
  status public.payment_plan_status NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cm_idx_plans_case ON public.payment_plans(case_id);

-- 8. payment_plan_installments
CREATE TABLE public.payment_plan_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  status public.payment_installment_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  paid_amount numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, installment_number)
);
CREATE INDEX cm_idx_installments_plan ON public.payment_plan_installments(plan_id);
CREATE INDEX cm_idx_installments_due ON public.payment_plan_installments(workspace_id, due_date) WHERE status IN ('pending','overdue');

-- 9. collection_portal_tokens
CREATE TABLE public.collection_portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.collection_cases(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  use_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cm_idx_portal_tokens_case ON public.collection_portal_tokens(case_id);
CREATE INDEX cm_idx_portal_tokens_active ON public.collection_portal_tokens(token) WHERE revoked_at IS NULL;

-- Triggers updated_at
CREATE TRIGGER cm_trg_dunning_sequences_updated BEFORE UPDATE ON public.dunning_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER cm_trg_dunning_steps_updated BEFORE UPDATE ON public.dunning_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER cm_trg_cases_updated BEFORE UPDATE ON public.collection_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER cm_trg_promises_updated BEFORE UPDATE ON public.payment_promises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER cm_trg_plans_updated BEFORE UPDATE ON public.payment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER cm_trg_installments_updated BEFORE UPDATE ON public.payment_plan_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.dunning_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_case_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY cm_seq_select ON public.dunning_sequences FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY cm_seq_manage ON public.dunning_sequences FOR ALL
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY cm_step_select ON public.dunning_steps FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY cm_step_manage ON public.dunning_steps FOR ALL
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY cm_cases_all ON public.collection_cases FOR ALL
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY cm_case_invoices_all ON public.collection_case_invoices FOR ALL
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY cm_actions_all ON public.collection_actions FOR ALL
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY cm_promises_all ON public.payment_promises FOR ALL
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY cm_plans_all ON public.payment_plans FOR ALL
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY cm_installments_all ON public.payment_plan_installments FOR ALL
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY cm_portal_tokens_select ON public.collection_portal_tokens FOR SELECT
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- recompute_case_totals
CREATE OR REPLACE FUNCTION public.recompute_case_totals(p_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_total_due numeric(12,2) := 0;
  v_total_paid numeric(12,2) := 0;
  v_count integer := 0;
  v_oldest date;
  v_days integer := 0;
  v_current_status public.collection_case_status;
  v_new_status public.collection_case_status;
BEGIN
  SELECT workspace_id, status INTO v_workspace_id, v_current_status
  FROM public.collection_cases WHERE id = p_case_id;

  IF v_workspace_id IS NULL THEN RETURN; END IF;

  UPDATE public.collection_case_invoices ci
  SET snapshot_total = i.total,
      snapshot_amount_paid = COALESCE(i.amount_paid, 0),
      snapshot_due_date = i.due_date
  FROM public.invoices i
  WHERE ci.invoice_id = i.id
    AND ci.case_id = p_case_id
    AND ci.removed_at IS NULL;

  SELECT
    COALESCE(SUM(snapshot_total), 0),
    COALESCE(SUM(snapshot_amount_paid), 0),
    COUNT(*),
    MIN(snapshot_due_date)
  INTO v_total_due, v_total_paid, v_count, v_oldest
  FROM public.collection_case_invoices
  WHERE case_id = p_case_id AND removed_at IS NULL;

  IF v_oldest IS NOT NULL THEN
    v_days := GREATEST(0, (CURRENT_DATE - v_oldest)::integer);
  END IF;

  v_new_status := v_current_status;
  IF (v_total_due - v_total_paid) <= 0.005 AND v_count > 0 THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 AND (v_total_due - v_total_paid) > 0.005
        AND v_current_status IN ('new','in_progress') THEN
    v_new_status := 'partially_paid';
  END IF;

  UPDATE public.collection_cases
  SET total_due = v_total_due,
      total_paid = v_total_paid,
      invoices_count = v_count,
      oldest_due_date = v_oldest,
      days_overdue = v_days,
      status = v_new_status,
      closed_at = CASE WHEN v_new_status = 'paid' AND closed_at IS NULL THEN now() ELSE closed_at END,
      updated_at = now()
  WHERE id = p_case_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_case_totals(uuid) TO authenticated;
