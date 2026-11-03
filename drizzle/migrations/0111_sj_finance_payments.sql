CREATE TABLE public.sj_enrollment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  enrollment_id uuid NOT NULL REFERENCES public.sj_enrollments(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES public.sj_installments(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL,
  method text NOT NULL CHECK (method IN ('mbway','transferencia','numerario','cartao','stripe','outro')),
  reference text CHECK (char_length(reference) <= 200),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sj_enrollment_payments_enr_idx ON public.sj_enrollment_payments(enrollment_id);
CREATE INDEX sj_installments_ws_due_idx ON public.sj_installments(workspace_id, due_date);
GRANT SELECT ON public.sj_enrollment_payments TO authenticated;
GRANT ALL ON public.sj_enrollment_payments TO service_role;
ALTER TABLE public.sj_enrollment_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY sj_payments_select ON public.sj_enrollment_payments FOR SELECT TO authenticated
  USING (public.sj_has_any_role(workspace_id, ARRAY['gestao','financeiro']));

ALTER TABLE public.sj_enrollments ADD COLUMN IF NOT EXISTS discount_reason text;

-- Estado financeiro derivado das prestações
CREATE OR REPLACE FUNCTION public.sj_recompute_financial_status(_enrollment_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int; v_total numeric; v_paid numeric; v_overdue numeric; v_status text;
  v_today date := (now() AT TIME ZONE 'Europe/Lisbon')::date;
BEGIN
  SELECT count(*), coalesce(sum(amount),0), coalesce(sum(paid_amount),0),
         coalesce(sum(CASE WHEN due_date < v_today THEN greatest(0, amount - coalesce(paid_amount,0)) ELSE 0 END),0)
    INTO v_count, v_total, v_paid, v_overdue FROM sj_installments WHERE enrollment_id=_enrollment_id;
  v_status := CASE WHEN v_count = 0 THEN 'sem_plano'
    WHEN v_paid >= v_total THEN 'liquidado'
    WHEN v_overdue > 0 THEN 'em_atraso'
    WHEN v_paid > 0 THEN 'parcial' ELSE 'em_dia' END;
  UPDATE sj_enrollments SET financial_status = v_status, updated_at = now() WHERE id=_enrollment_id;
  RETURN v_status;
END $$;

CREATE OR REPLACE FUNCTION public.sj_set_payment_plan(_enrollment_id uuid, _base numeric, _discount numeric, _agreed numeric, _discount_reason text, _installments jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ws uuid; v_sum numeric; v_old jsonb; v_paid numeric; i jsonb; n int := 0;
BEGIN
  SELECT workspace_id, to_jsonb(e) INTO v_ws, v_old FROM sj_enrollments e WHERE id=_enrollment_id;
  IF v_ws IS NULL OR NOT sj_has_any_role(v_ws, ARRAY['gestao','financeiro']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _agreed IS NULL OR _agreed < 0 OR coalesce(_discount,0) < 0 THEN RAISE EXCEPTION 'Valores inválidos'; END IF;
  IF jsonb_array_length(_installments) < 1 OR jsonb_array_length(_installments) > 60 THEN RAISE EXCEPTION 'Número de prestações inválido'; END IF;
  SELECT sum((x->>'amount')::numeric) INTO v_sum FROM jsonb_array_elements(_installments) x;
  IF round(v_sum,2) <> round(_agreed,2) THEN RAISE EXCEPTION 'A soma das prestações (%) difere do valor acordado (%)', v_sum, _agreed; END IF;
  SELECT coalesce(sum(amount),0) INTO v_paid FROM sj_enrollment_payments WHERE enrollment_id=_enrollment_id;
  IF v_paid > _agreed THEN RAISE EXCEPTION 'Já foram recebidos % — superior ao valor acordado', v_paid; END IF;

  UPDATE sj_enrollments SET base_amount=_base, discount_amount=coalesce(_discount,0), agreed_amount=_agreed,
    discount_reason=left(_discount_reason,300), updated_at=now() WHERE id=_enrollment_id;
  UPDATE sj_enrollment_payments SET installment_id=NULL WHERE enrollment_id=_enrollment_id;
  DELETE FROM sj_installments WHERE enrollment_id=_enrollment_id;
  FOR i IN SELECT * FROM jsonb_array_elements(_installments) LOOP
    n := n + 1;
    INSERT INTO sj_installments(workspace_id, enrollment_id, installment_no, amount, due_date, paid_amount)
    VALUES (v_ws, _enrollment_id, n, (i->>'amount')::numeric, (i->>'due_date')::date, 0);
  END LOOP;
  -- Reaplicar pagamentos já recebidos às prestações por ordem de vencimento
  PERFORM sj_reallocate_payments(_enrollment_id);
  PERFORM sj_recompute_financial_status(_enrollment_id);
  INSERT INTO activity_logs(workspace_id,user_id,table_name,record_id,action,old_data,new_data,module)
  VALUES (v_ws, auth.uid(), 'sj_enrollments', _enrollment_id, 'payment_plan_set', v_old,
    jsonb_build_object('base',_base,'discount',_discount,'agreed',_agreed,'installments',_installments), 'student_journey');
END $$;

CREATE OR REPLACE FUNCTION public.sj_reallocate_payments(_enrollment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_left numeric; r record; v_take numeric; v_last date;
BEGIN
  SELECT coalesce(sum(amount),0), max(paid_on) INTO v_left, v_last FROM sj_enrollment_payments WHERE enrollment_id=_enrollment_id;
  FOR r IN SELECT id, amount FROM sj_installments WHERE enrollment_id=_enrollment_id ORDER BY due_date, installment_no LOOP
    v_take := least(r.amount, v_left);
    v_left := v_left - v_take;
    UPDATE sj_installments SET paid_amount=v_take, paid_at = CASE WHEN v_take >= amount THEN v_last ELSE NULL END, updated_at=now() WHERE id=r.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.sj_register_payment(_enrollment_id uuid, _amount numeric, _paid_on date, _method text, _reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ws uuid; v_open numeric; v_id uuid; v_inst uuid;
BEGIN
  SELECT workspace_id INTO v_ws FROM sj_enrollments WHERE id=_enrollment_id;
  IF v_ws IS NULL OR NOT sj_has_any_role(v_ws, ARRAY['gestao','financeiro']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _paid_on IS NULL OR _paid_on > (now() AT TIME ZONE 'Europe/Lisbon')::date THEN RAISE EXCEPTION 'Data inválida'; END IF;
  SELECT coalesce(sum(amount - paid_amount),0) INTO v_open FROM sj_installments WHERE enrollment_id=_enrollment_id;
  IF NOT EXISTS (SELECT 1 FROM sj_installments WHERE enrollment_id=_enrollment_id) THEN RAISE EXCEPTION 'Defina primeiro o plano de pagamento'; END IF;
  IF round(_amount,2) > round(v_open,2) THEN RAISE EXCEPTION 'Valor superior ao saldo em aberto (%)', v_open; END IF;
  SELECT id INTO v_inst FROM sj_installments WHERE enrollment_id=_enrollment_id AND paid_amount < amount ORDER BY due_date, installment_no LIMIT 1;
  INSERT INTO sj_enrollment_payments(workspace_id, enrollment_id, installment_id, amount, paid_on, method, reference)
  VALUES (v_ws, _enrollment_id, v_inst, round(_amount,2), _paid_on, _method, left(_reference,200)) RETURNING id INTO v_id;
  PERFORM sj_reallocate_payments(_enrollment_id);
  PERFORM sj_recompute_financial_status(_enrollment_id);
  INSERT INTO activity_logs(workspace_id,user_id,table_name,record_id,action,new_data,module)
  VALUES (v_ws, auth.uid(), 'sj_enrollment_payments', v_id, 'payment_registered',
    jsonb_build_object('enrollment_id',_enrollment_id,'amount',_amount,'paid_on',_paid_on,'method',_method,'reference',_reference), 'student_journey');
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.sj_link_invoice(_enrollment_id uuid, _invoice_id uuid, _allocated numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ws uuid; v_inv_ws uuid; v_id uuid;
BEGIN
  SELECT workspace_id INTO v_ws FROM sj_enrollments WHERE id=_enrollment_id;
  IF v_ws IS NULL OR NOT sj_has_any_role(v_ws, ARRAY['gestao','financeiro']) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT workspace_id INTO v_inv_ws FROM invoices WHERE id=_invoice_id;
  IF v_inv_ws IS DISTINCT FROM v_ws THEN RAISE EXCEPTION 'Fatura de outro workspace'; END IF;
  IF EXISTS (SELECT 1 FROM sj_enrollment_invoices WHERE enrollment_id=_enrollment_id AND invoice_id=_invoice_id) THEN RAISE EXCEPTION 'Fatura já associada'; END IF;
  IF _allocated IS NOT NULL AND _allocated <= 0 THEN RAISE EXCEPTION 'Valor atribuído inválido'; END IF;
  INSERT INTO sj_enrollment_invoices(workspace_id, enrollment_id, invoice_id, allocated_amount, created_by)
  VALUES (v_ws, _enrollment_id, _invoice_id, _allocated, auth.uid()) RETURNING id INTO v_id;
  INSERT INTO activity_logs(workspace_id,user_id,table_name,record_id,action,new_data,module)
  VALUES (v_ws, auth.uid(), 'sj_enrollment_invoices', v_id, 'invoice_linked',
    jsonb_build_object('enrollment_id',_enrollment_id,'invoice_id',_invoice_id,'allocated',_allocated), 'student_journey');
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.sj_recompute_financial_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sj_reallocate_payments(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sj_set_payment_plan(uuid,numeric,numeric,numeric,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sj_register_payment(uuid,numeric,date,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sj_link_invoice(uuid,uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sj_set_payment_plan(uuid,numeric,numeric,numeric,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sj_register_payment(uuid,numeric,date,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sj_link_invoice(uuid,uuid,numeric) TO authenticated;