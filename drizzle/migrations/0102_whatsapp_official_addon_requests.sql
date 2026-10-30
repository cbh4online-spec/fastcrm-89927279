INSERT INTO public.billing_addons (code, name, description, category, unit_name, price_per_unit, currency, is_active, billing_period, included_quantity)
SELECT 'addon_whatsapp_official', 'WhatsApp Business Oficial', 'Número oficial da Meta ligado a um workspace: envio direto pelo CRM. Custos de mensagens da Meta à parte.', 'whatsapp', 'número', 49, 'EUR', true, 'monthly', 1
WHERE NOT EXISTS (SELECT 1 FROM public.billing_addons WHERE code = 'addon_whatsapp_official');

CREATE TABLE public.whatsapp_official_number_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  phone_number text NOT NULL CHECK (char_length(phone_number) BETWEEN 8 AND 20),
  business_name text CHECK (business_name IS NULL OR char_length(business_name) <= 120),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','active','cancelled')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text CHECK (review_notes IS NULL OR char_length(review_notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.whatsapp_official_number_requests TO authenticated;
GRANT ALL ON public.whatsapp_official_number_requests TO service_role;

ALTER TABLE public.whatsapp_official_number_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_wa_official_req_ws ON public.whatsapp_official_number_requests(workspace_id, status);
CREATE UNIQUE INDEX uq_wa_official_req_open ON public.whatsapp_official_number_requests(workspace_id, phone_number) WHERE status IN ('pending','approved','active');

CREATE POLICY "wa_official_req_select" ON public.whatsapp_official_number_requests
FOR SELECT TO authenticated
USING (public.can_manage_workspace(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "wa_official_req_insert" ON public.whatsapp_official_number_requests
FOR INSERT TO authenticated
WITH CHECK (requested_by = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND public.can_manage_workspace(auth.uid(), workspace_id));

CREATE POLICY "wa_official_req_cancel" ON public.whatsapp_official_number_requests
FOR UPDATE TO authenticated
USING (public.can_manage_workspace(auth.uid(), workspace_id) AND status = 'pending')
WITH CHECK (status = 'cancelled' AND reviewed_by IS NULL);

CREATE POLICY "wa_official_req_superadmin" ON public.whatsapp_official_number_requests
FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_wa_official_req_updated BEFORE UPDATE ON public.whatsapp_official_number_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_wa_official_req_audit AFTER INSERT OR UPDATE ON public.whatsapp_official_number_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();