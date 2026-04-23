CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  company_size TEXT,
  sector TEXT,
  message TEXT,
  source_page TEXT NOT NULL DEFAULT 'home',
  lead_type TEXT NOT NULL DEFAULT 'contact',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referrer TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  assigned_to UUID,
  notes TEXT,
  contacted_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_leads_lead_type_check CHECK (lead_type IN ('demo','contact','resource','pricing','partnership')),
  CONSTRAINT marketing_leads_status_check CHECK (status IN ('new','contacted','qualified','customer','discarded'))
);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_email ON public.marketing_leads(email);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON public.marketing_leads(status);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_lead_type ON public.marketing_leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_created_at ON public.marketing_leads(created_at DESC);

CREATE TRIGGER trg_marketing_leads_updated_at
BEFORE UPDATE ON public.marketing_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a marketing lead"
ON public.marketing_leads FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can read marketing leads"
ON public.marketing_leads FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update marketing leads"
ON public.marketing_leads FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Super admins can delete marketing leads"
ON public.marketing_leads FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'::app_role));