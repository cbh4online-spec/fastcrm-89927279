
-- =============================================
-- security_leads: Leads/Oportunidades de Segurança
-- =============================================
CREATE TABLE public.security_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Origin
  origin TEXT NOT NULL DEFAULT 'manual', -- direct, partner, site, phone, email, whatsapp, telegram, manual
  partner_id UUID REFERENCES public.security_partners(id) ON DELETE SET NULL,
  partner_request_id UUID REFERENCES public.security_partner_requests(id) ON DELETE SET NULL,
  source_channel TEXT,
  
  -- Client info
  client_id UUID REFERENCES public.security_clients(id) ON DELETE SET NULL,
  client_name TEXT,
  client_type TEXT, -- particular, empresa, condominio
  
  -- Installation
  site_id UUID REFERENCES public.security_installation_sites(id) ON DELETE SET NULL,
  installation_address TEXT,
  
  -- Need
  need_description TEXT,
  system_type TEXT, -- cctv, intrusion, sadi, access_control, mixed
  request_type TEXT, -- certification, installation, maintenance, expansion, regularization
  
  -- Status & priority
  status TEXT NOT NULL DEFAULT 'new', -- new, qualifying, qualified, proposal_sent, won, lost, archived
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  lost_reason TEXT,
  
  -- Commercial
  estimated_value NUMERIC(12,2),
  assigned_to UUID,
  
  -- Attachments & notes
  notes TEXT,
  attachments_json JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

ALTER TABLE public.security_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage security_leads in their workspace"
ON public.security_leads FOR ALL TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- =============================================
-- security_proposals: Propostas de Segurança
-- =============================================
CREATE TABLE public.security_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Links
  lead_id UUID REFERENCES public.security_leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.security_clients(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.security_installation_sites(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.security_partners(id) ON DELETE SET NULL,
  
  -- Proposal content
  proposal_number TEXT,
  title TEXT,
  solution_description TEXT,
  equipment_json JSONB DEFAULT '[]'::jsonb, -- [{catalog_item_id, name, brand, model, qty, unit_price, total}]
  labor_value NUMERIC(12,2) DEFAULT 0,
  equipment_value NUMERIC(12,2) DEFAULT 0,
  total_value NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  final_value NUMERIC(12,2) DEFAULT 0,
  
  -- Version control
  version INTEGER NOT NULL DEFAULT 1,
  parent_proposal_id UUID REFERENCES public.security_proposals(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, under_review, accepted, rejected, expired
  validity_days INTEGER DEFAULT 30,
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Commercial notes
  commercial_notes TEXT,
  internal_notes TEXT,
  conditions TEXT,
  
  -- Attachments
  attachments_json JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

ALTER TABLE public.security_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage security_proposals in their workspace"
ON public.security_proposals FOR ALL TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- =============================================
-- Add lead_id and proposal_id to contracts for traceability
-- =============================================
ALTER TABLE public.security_contracts ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.security_leads(id) ON DELETE SET NULL;
ALTER TABLE public.security_contracts ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES public.security_proposals(id) ON DELETE SET NULL;
ALTER TABLE public.security_contracts ADD COLUMN IF NOT EXISTS adjudication_date DATE;
ALTER TABLE public.security_contracts ADD COLUMN IF NOT EXISTS internal_responsible UUID;
ALTER TABLE public.security_contracts ADD COLUMN IF NOT EXISTS planned_start_date DATE;
ALTER TABLE public.security_contracts ADD COLUMN IF NOT EXISTS planned_end_date DATE;
ALTER TABLE public.security_contracts ADD COLUMN IF NOT EXISTS notes TEXT;

-- Link partner_request to lead
ALTER TABLE public.security_partner_requests ADD COLUMN IF NOT EXISTS linked_security_lead_id UUID REFERENCES public.security_leads(id) ON DELETE SET NULL;
