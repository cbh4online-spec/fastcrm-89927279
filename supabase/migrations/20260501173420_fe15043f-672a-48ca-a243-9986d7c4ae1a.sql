-- 1. Tabela de auditoria estruturada de aprovações
CREATE TABLE IF NOT EXISTS public.partner_order_approvals_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  partner_order_id uuid NOT NULL REFERENCES public.partner_order_headers(id) ON DELETE CASCADE,
  partner_account_id uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','rejected','cancelled','reopened','auto')),
  decided_by uuid,
  decision_reason text,
  total_gross numeric(12,2) NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_approvals_log_ws_created
  ON public.partner_order_approvals_log (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_approvals_log_order
  ON public.partner_order_approvals_log (partner_order_id);
CREATE INDEX IF NOT EXISTS idx_partner_approvals_log_account
  ON public.partner_order_approvals_log (partner_account_id, created_at DESC);

ALTER TABLE public.partner_order_approvals_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_approvals_log_read_ws"
  ON public.partner_order_approvals_log
  FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- Inserções apenas via trigger (service_role / definer). Sem políticas de INSERT/UPDATE/DELETE para utilizadores.

-- 2. Trigger: regista a transição e notifica o parceiro
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

  -- Mapear transição -> decisão
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
  ELSIF NEW.status = 'cancelled' THEN
    v_decision := 'cancelled';
    v_title := 'Encomenda cancelada';
    v_message := format('A encomenda %s foi cancelada.', NEW.order_number);
  ELSE
    -- Outras transições não geram entrada de aprovação
    RETURN NEW;
  END IF;

  -- 2a. Insere log de auditoria
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

  -- 2b. Cria notificação em admin_notifications para cada partner_user da conta
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
      jsonb_build_object(
        'partner_order_id', NEW.id,
        'order_number', NEW.order_number,
        'decision', v_decision,
        'total_gross', NEW.total_gross
      ),
      false
    );
  END LOOP;

  -- 2c. Também regista entrada no partner_activity_logs (compatibilidade)
  INSERT INTO public.partner_activity_logs (
    workspace_id, partner_account_id, actor_type, actor_id,
    action, entity_type, entity_id, payload
  ) VALUES (
    NEW.workspace_id, NEW.partner_account_id,
    'admin', COALESCE(auth.uid()::text, 'system'),
    'order_'||v_decision, 'partner_order', NEW.id::text,
    jsonb_build_object(
      'order_number', NEW.order_number,
      'previous_status', OLD.status,
      'new_status', NEW.status,
      'reason', COALESCE(NEW.rejection_reason, NEW.notes)
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partner_order_approval_audit ON public.partner_order_headers;
CREATE TRIGGER partner_order_approval_audit
  AFTER UPDATE OF status ON public.partner_order_headers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_partner_order_approval_audit();