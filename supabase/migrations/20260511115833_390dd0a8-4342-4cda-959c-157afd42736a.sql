-- Pipeline automation settings (per workspace)
CREATE TABLE IF NOT EXISTS public.pipeline_automation_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auto_invoice_on_won boolean NOT NULL DEFAULT true,
  attach_pdf_whatsapp boolean NOT NULL DEFAULT true,
  whatsapp_template text NOT NULL DEFAULT 'Olá {{cliente}}, segue a fatura nº {{numero}} no valor de {{total}}. Pode aceder aqui: {{link}}. Obrigado!',
  proposal_whatsapp_template text NOT NULL DEFAULT 'Olá {{cliente}}, segue a proposta {{titulo}} no valor de {{total}}. Pode consultar aqui: {{link}}',
  default_validity_days integer NOT NULL DEFAULT 7,
  default_payment_conditions text DEFAULT 'Pronto pagamento',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pas_select_members" ON public.pipeline_automation_settings
  FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "pas_insert_admins" ON public.pipeline_automation_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "pas_update_admins" ON public.pipeline_automation_settings
  FOR UPDATE TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE TRIGGER trg_pas_updated_at
  BEFORE UPDATE ON public.pipeline_automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add link columns to invoices for InvoiceXpress integration (idempotent)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_provider text,
  ADD COLUMN IF NOT EXISTS public_url text,
  ADD COLUMN IF NOT EXISTS pdf_url text;

CREATE INDEX IF NOT EXISTS idx_invoices_external ON public.invoices(workspace_id, external_provider, external_id);