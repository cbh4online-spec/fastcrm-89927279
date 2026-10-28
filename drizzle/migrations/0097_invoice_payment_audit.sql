CREATE TABLE public.invoice_payment_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  payment_id uuid NOT NULL,
  invoice_id uuid,
  action text NOT NULL CHECK (action IN ('UPDATE','DELETE')),
  actor_id uuid,
  reason text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoice_payment_audit_invoice_idx ON public.invoice_payment_audit(invoice_id, created_at DESC);
GRANT SELECT ON public.invoice_payment_audit TO authenticated;
GRANT ALL ON public.invoice_payment_audit TO service_role;
ALTER TABLE public.invoice_payment_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance managers read payment audit" ON public.invoice_payment_audit FOR SELECT TO authenticated
  USING (public.has_workspace_capability(auth.uid(), workspace_id, 'finance.manage'));

CREATE OR REPLACE FUNCTION public.invoice_payments_audit_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.invoice_payment_audit(workspace_id, payment_id, invoice_id, action, actor_id, reason, old_data, new_data)
  VALUES (OLD.workspace_id, OLD.id, OLD.invoice_id, TG_OP, auth.uid(),
          NULLIF(current_setting('app.payment_change_reason', true), ''),
          to_jsonb(OLD), CASE WHEN TG_OP='UPDATE' THEN to_jsonb(NEW) ELSE NULL END);
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER invoice_payments_audit AFTER UPDATE OR DELETE ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.invoice_payments_audit_fn();

CREATE OR REPLACE FUNCTION public.update_invoice_payment(_id uuid, _amount numeric, _payment_date date, _payment_method text, _reference text, _notes text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  SELECT workspace_id INTO ws FROM public.invoice_payments WHERE id=_id;
  IF ws IS NULL THEN RAISE EXCEPTION 'Recibo não encontrado'; END IF;
  IF NOT public.has_workspace_capability(auth.uid(), ws, 'finance.manage') THEN RAISE EXCEPTION 'Sem permissão para corrigir recibos'; END IF;
  IF length(trim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'Indique o motivo (mínimo 3 caracteres)'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  PERFORM set_config('app.payment_change_reason', left(trim(_reason),500), true);
  UPDATE public.invoice_payments SET amount=round(_amount,2), payment_date=_payment_date,
    payment_method=left(_payment_method,50), reference=left(_reference,120), notes=left(_notes,1000)
  WHERE id=_id;
END $$;

CREATE OR REPLACE FUNCTION public.void_invoice_payment(_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  SELECT workspace_id INTO ws FROM public.invoice_payments WHERE id=_id;
  IF ws IS NULL THEN RAISE EXCEPTION 'Recibo não encontrado'; END IF;
  IF NOT public.has_workspace_capability(auth.uid(), ws, 'finance.manage') THEN RAISE EXCEPTION 'Sem permissão para anular recibos'; END IF;
  IF length(trim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'Indique o motivo (mínimo 3 caracteres)'; END IF;
  PERFORM set_config('app.payment_change_reason', left(trim(_reason),500), true);
  DELETE FROM public.invoice_payments WHERE id=_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.update_invoice_payment(uuid,numeric,date,text,text,text,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.void_invoice_payment(uuid,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_invoice_payment(uuid,numeric,date,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_invoice_payment(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.capability_grants_audit_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record := COALESCE(NEW, OLD);
BEGIN
  INSERT INTO public.activity_logs(workspace_id, user_id, table_name, record_id, action, old_data, new_data)
  VALUES (r.workspace_id, auth.uid(), 'workspace_member_capability_grants', r.id, TG_OP,
          CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) END, CASE WHEN TG_OP='INSERT' THEN to_jsonb(NEW) END);
  RETURN r;
END $$;
CREATE TRIGGER capability_grants_audit AFTER INSERT OR DELETE ON public.workspace_member_capability_grants
  FOR EACH ROW EXECUTE FUNCTION public.capability_grants_audit_fn();