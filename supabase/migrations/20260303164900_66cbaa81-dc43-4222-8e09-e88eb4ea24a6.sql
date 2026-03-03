
-- Add updated_by column to rfqs
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Create rfq_audit_log table
CREATE TABLE public.rfq_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb
);

-- Indexes
CREATE INDEX idx_rfq_audit_log_workspace ON public.rfq_audit_log(workspace_id);
CREATE INDEX idx_rfq_audit_log_rfq_time ON public.rfq_audit_log(rfq_id, changed_at DESC);

-- RLS
ALTER TABLE public.rfq_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view rfq audit logs"
  ON public.rfq_audit_log FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.fn_rfq_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _field text;
  _fields text[] := ARRAY['title','status','due_date','notes','currency','payment_terms','delivery_location','quote_validity_days','incoterm','buyer_name','buyer_email','project_id'];
  _old_val jsonb;
  _new_val jsonb;
BEGIN
  FOREACH _field IN ARRAY _fields LOOP
    EXECUTE format('SELECT to_jsonb(($1).%I), to_jsonb(($2).%I)', _field, _field)
      INTO _old_val, _new_val
      USING OLD, NEW;

    IF _old_val IS DISTINCT FROM _new_val THEN
      INSERT INTO public.rfq_audit_log (workspace_id, rfq_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.workspace_id, NEW.id, NEW.updated_by, _field, _old_val, _new_val);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_rfq_audit
  BEFORE UPDATE ON public.rfqs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_rfq_audit_trigger();
