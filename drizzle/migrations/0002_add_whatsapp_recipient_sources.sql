-- Preserve the CRM source for every WhatsApp campaign recipient. This allows
-- campaigns to target Contacts, Leads and Companies without losing attribution.
ALTER TABLE public.whatsapp_campaign_recipients
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wa_recipients_lead_id
  ON public.whatsapp_campaign_recipients(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_recipients_company_id
  ON public.whatsapp_campaign_recipients(company_id)
  WHERE company_id IS NOT NULL;
