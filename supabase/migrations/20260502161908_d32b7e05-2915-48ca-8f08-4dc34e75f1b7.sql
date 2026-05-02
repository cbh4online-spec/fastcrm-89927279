
-- 1. Permitir transição rejected -> awaiting_approval no stock lifecycle (re-reservar)
CREATE OR REPLACE FUNCTION public.handle_partner_order_stock_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_result JSONB;
  v_committed_status TEXT[] := ARRAY['submitted','approved','processing','shipped','delivered','invoiced','completed'];
  v_released_status  TEXT[] := ARRAY['rejected','cancelled','refused'];
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- COMMIT
  IF OLD.status = 'awaiting_approval'
     AND NEW.status = ANY (v_committed_status)
     AND NEW.stock_committed = false THEN
    FOR v_item IN
      SELECT variant_id, quantity FROM public.partner_order_items
       WHERE partner_order_id = NEW.id AND variant_id IS NOT NULL
    LOOP
      v_result := public.commit_partner_variant_stock(NEW.workspace_id, v_item.variant_id, v_item.quantity, true);
    END LOOP;
    NEW.stock_committed := true;
    NEW.stock_reserved  := false;

  -- RELEASE awaiting -> rejected/cancelled
  ELSIF OLD.status = 'awaiting_approval'
        AND NEW.status = ANY (v_released_status)
        AND NEW.stock_reserved = true THEN
    FOR v_item IN
      SELECT variant_id, quantity FROM public.partner_order_items
       WHERE partner_order_id = NEW.id AND variant_id IS NOT NULL
    LOOP
      v_result := public.release_partner_variant_stock(NEW.workspace_id, v_item.variant_id, v_item.quantity);
    END LOOP;
    NEW.stock_reserved := false;

  -- REOPEN: rejected -> awaiting_approval => re-reservar
  ELSIF OLD.status = 'rejected'
        AND NEW.status = 'awaiting_approval' THEN
    FOR v_item IN
      SELECT variant_id, quantity FROM public.partner_order_items
       WHERE partner_order_id = NEW.id AND variant_id IS NOT NULL
    LOOP
      v_result := public.reserve_partner_variant_stock(NEW.workspace_id, v_item.variant_id, v_item.quantity, true);
    END LOOP;
    NEW.stock_reserved  := true;
    NEW.stock_committed := false;
    NEW.rejected_at := NULL;
    NEW.rejection_reason := NULL;

  -- RELEASE de encomendas já comprometidas que são canceladas
  ELSIF OLD.stock_committed = true
        AND NEW.status = ANY (v_released_status)
        AND OLD.status <> ALL (v_released_status) THEN
    FOR v_item IN
      SELECT variant_id, quantity FROM public.partner_order_items
       WHERE partner_order_id = NEW.id AND variant_id IS NOT NULL
    LOOP
      UPDATE public.product_variants
         SET stock_quantity = stock_quantity + v_item.quantity, updated_at = now()
       WHERE id = v_item.variant_id AND workspace_id = NEW.workspace_id AND track_stock = true;
    END LOOP;
    NEW.stock_committed := false;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Atualizar o trigger de auditoria para registar reabertura
CREATE OR REPLACE FUNCTION public.trg_partner_order_approval_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision text;
  v_title text;
  v_message text;
  v_partner_user RECORD;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'awaiting_approval' AND NEW.status IN ('submitted','approved','processing') THEN
    v_decision := 'approved';
    v_title := 'Encomenda aprovada';
    v_message := format('A sua encomenda %s foi aprovada.', NEW.order_number);
  ELSIF OLD.status = 'awaiting_approval' AND NEW.status = 'rejected' THEN
    v_decision := 'rejected';
    v_title := 'Encomenda rejeitada';
    v_message := format('A sua encomenda %s foi rejeitada.%s',
      NEW.order_number,
      CASE WHEN NEW.rejection_reason IS NOT NULL THEN ' Motivo: '||NEW.rejection_reason ELSE '' END);
  ELSIF OLD.status = 'rejected' AND NEW.status = 'awaiting_approval' THEN
    v_decision := 'reopened';
    v_title := 'Encomenda reaberta';
    v_message := format('A encomenda %s foi reaberta e está novamente em análise.', NEW.order_number);
  ELSIF NEW.status = 'cancelled' THEN
    v_decision := 'cancelled';
    v_title := 'Encomenda cancelada';
    v_message := format('A encomenda %s foi cancelada.', NEW.order_number);
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.partner_order_approvals_log (
    workspace_id, partner_order_id, partner_account_id, order_number,
    previous_status, new_status, decision, decided_by, decision_reason,
    total_gross, metadata
  ) VALUES (
    NEW.workspace_id, NEW.id, NEW.partner_account_id, NEW.order_number,
    OLD.status::text, NEW.status::text, v_decision,
    COALESCE(NEW.approver_user_id, auth.uid()),
    COALESCE(NEW.rejection_reason, NEW.notes),
    NEW.total_gross,
    jsonb_build_object(
      'stock_committed', NEW.stock_committed,
      'stock_reserved', NEW.stock_reserved,
      'payment_status', NEW.payment_status
    )
  );

  FOR v_partner_user IN
    SELECT auth_user_id FROM public.partner_users
    WHERE partner_account_id = NEW.partner_account_id AND is_active = true
  LOOP
    INSERT INTO public.admin_notifications (
      workspace_id, user_id, type, title, message, metadata, is_read
    ) VALUES (
      NEW.workspace_id,
      v_partner_user.auth_user_id,
      'partner_order_'||v_decision,
      v_title,
      v_message,
      jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number, 'decision', v_decision),
      false
    );
  END LOOP;

  -- Compatibilidade: log adicional em partner_activity_logs (best-effort)
  BEGIN
    INSERT INTO public.partner_activity_logs (workspace_id, partner_account_id, activity_type, description, metadata)
    VALUES (NEW.workspace_id, NEW.partner_account_id, 'order_'||v_decision,
            v_message, jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;

-- 3. RPC para reabrir uma encomenda rejeitada
CREATE OR REPLACE FUNCTION public.reopen_partner_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.partner_order_headers WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF NOT (is_workspace_member(auth.uid(), v_order.workspace_id) OR is_super_admin(auth.uid())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF v_order.status <> 'rejected' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'current', v_order.status);
  END IF;

  UPDATE public.partner_order_headers
     SET status = 'awaiting_approval',
         approver_user_id = NULL,
         approved_at = NULL,
         updated_at = now()
   WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reopen_partner_order(uuid) TO authenticated;
