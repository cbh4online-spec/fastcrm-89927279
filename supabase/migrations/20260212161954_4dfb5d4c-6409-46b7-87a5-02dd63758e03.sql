
-- Table for FastCRM commercial proposals (qualification form submissions + calculated results)
CREATE TABLE public.fastcrm_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Form submission data
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  sector TEXT,
  users_count INTEGER NOT NULL DEFAULT 1,
  contacts_count INTEGER NOT NULL DEFAULT 100,
  workspaces_count INTEGER NOT NULL DEFAULT 1,
  needs_whatsapp BOOLEAN NOT NULL DEFAULT false,
  needs_instagram BOOLEAN NOT NULL DEFAULT false,
  needs_ecommerce BOOLEAN NOT NULL DEFAULT false,
  needs_client_portal BOOLEAN NOT NULL DEFAULT false,
  needs_knowledge_base BOOLEAN NOT NULL DEFAULT false,
  needs_ai_sales_coach BOOLEAN NOT NULL DEFAULT false,
  needs_api BOOLEAN NOT NULL DEFAULT false,
  integrations_required TEXT,
  ai_usage_level TEXT NOT NULL DEFAULT 'low',
  
  -- Calculated results
  recommended_plan TEXT NOT NULL DEFAULT 'free',
  plan_base_price NUMERIC NOT NULL DEFAULT 0,
  addons_total NUMERIC NOT NULL DEFAULT 0,
  users_adjustment NUMERIC NOT NULL DEFAULT 0,
  contacts_adjustment NUMERIC NOT NULL DEFAULT 0,
  workspaces_adjustment NUMERIC NOT NULL DEFAULT 0,
  ai_pack_price NUMERIC NOT NULL DEFAULT 0,
  ai_pack_label TEXT,
  monthly_total NUMERIC NOT NULL DEFAULT 0,
  setup_fee NUMERIC NOT NULL DEFAULT 0,
  setup_fee_label TEXT,
  
  -- Tracking
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  proposal_pdf_url TEXT,
  proposal_html TEXT,
  email_sent_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fastcrm_proposals ENABLE ROW LEVEL SECURITY;

-- RLS policies - workspace members can read
CREATE POLICY "Workspace members can view proposals"
  ON public.fastcrm_proposals FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace members can insert
CREATE POLICY "Workspace members can create proposals"
  ON public.fastcrm_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace members can update
CREATE POLICY "Workspace members can update proposals"
  ON public.fastcrm_proposals FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Public insert for qualification form (anonymous submissions)
CREATE POLICY "Anyone can submit qualification form"
  ON public.fastcrm_proposals FOR INSERT
  TO anon
  WITH CHECK (true);

-- Storage bucket for proposal PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('proposal-pdfs', 'proposal-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy for proposal PDFs
CREATE POLICY "Anyone can view proposal PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'proposal-pdfs');

-- Authenticated users can upload proposal PDFs
CREATE POLICY "Authenticated users can upload proposal PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'proposal-pdfs');

-- Service role can upload (for edge functions)
CREATE POLICY "Service role can manage proposal PDFs"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'proposal-pdfs');

-- Updated at trigger
CREATE TRIGGER update_fastcrm_proposals_updated_at
  BEFORE UPDATE ON public.fastcrm_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
