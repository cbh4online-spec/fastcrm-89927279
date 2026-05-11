-- Histórico de envios por WhatsApp associados a faturas (auditoria)
CREATE TABLE IF NOT EXISTS public.invoice_whatsapp_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  phone text NOT NULL,
  message_text text,
  share_url text,
  status text NOT NULL DEFAULT 'sent',
  provider_message_id text,
  error_message text,
  agent_id uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  clicked_at timestamptz,
  failed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_wa_sends_invoice ON public.invoice_whatsapp_sends(invoice_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_wa_sends_ws ON public.invoice_whatsapp_sends(workspace_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_wa_sends_provider_msg ON public.invoice_whatsapp_sends(provider_message_id) WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.invoice_whatsapp_sends ENABLE ROW LEVEL SECURITY;

-- Membros do workspace podem ver
CREATE POLICY "wa_sends_select_members"
ON public.invoice_whatsapp_sends
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = invoice_whatsapp_sends.workspace_id
      AND wm.user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

-- Membros do workspace podem inserir (registo do envio é feito client-side após o send mutation)
CREATE POLICY "wa_sends_insert_members"
ON public.invoice_whatsapp_sends
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = invoice_whatsapp_sends.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Updates apenas via service_role (delivery webhooks/click tracking)
CREATE POLICY "wa_sends_update_service"
ON public.invoice_whatsapp_sends
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER trg_invoice_whatsapp_sends_updated_at
BEFORE UPDATE ON public.invoice_whatsapp_sends
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();