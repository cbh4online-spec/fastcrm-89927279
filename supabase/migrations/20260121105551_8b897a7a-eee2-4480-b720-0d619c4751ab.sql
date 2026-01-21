-- Credit Intermediation Module Tables (without marketplace insert)

-- Bank Partners
CREATE TABLE IF NOT EXISTS public.bank_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  credit_types TEXT[] DEFAULT '{}',
  terms JSONB DEFAULT '[]',
  commission_rates JSONB DEFAULT '[]',
  avg_approval_rate NUMERIC,
  avg_processing_days INTEGER,
  total_proposals_submitted INTEGER DEFAULT 0,
  total_funded INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial Profiles
CREATE TABLE IF NOT EXISTS public.financial_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company')),
  entity_id UUID NOT NULL,
  monthly_income NUMERIC NOT NULL DEFAULT 0,
  annual_income NUMERIC NOT NULL DEFAULT 0,
  income_type TEXT DEFAULT 'employment',
  income_stability TEXT DEFAULT 'stable',
  monthly_expenses NUMERIC DEFAULT 0,
  existing_credits JSONB DEFAULT '[]',
  total_monthly_installments NUMERIC DEFAULT 0,
  effort_rate NUMERIC DEFAULT 0,
  disposable_income NUMERIC DEFAULT 0,
  debt_to_income_ratio NUMERIC DEFAULT 0,
  assets JSONB DEFAULT '[]',
  total_assets_value NUMERIC DEFAULT 0,
  credit_score INTEGER,
  score_factors JSONB,
  score_calculated_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, entity_type, entity_id)
);

-- Credit Proposals
CREATE TABLE IF NOT EXISTS public.credit_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('habitacao', 'pessoal', 'empresarial', 'automovel')),
  purpose TEXT,
  amount_requested NUMERIC NOT NULL,
  term_months INTEGER NOT NULL,
  property_value NUMERIC,
  property_location TEXT,
  ltv_ratio NUMERIC,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'draft',
  status_history JSONB DEFAULT '[]',
  current_stage_since TIMESTAMPTZ,
  bank_submissions JSONB DEFAULT '[]',
  selected_bank_id UUID,
  approved_amount NUMERIC,
  approved_rate NUMERIC,
  approved_term INTEGER,
  approved_monthly_payment NUMERIC,
  approved_taeg NUMERIC,
  ai_viability_score NUMERIC,
  ai_approval_probability NUMERIC,
  ai_recommended_banks JSONB,
  ai_risk_assessment TEXT,
  ai_optimization_tips JSONB,
  ai_analyzed_at TIMESTAMPTZ,
  required_documents JSONB DEFAULT '[]',
  documents_complete BOOLEAN DEFAULT false,
  commission_amount NUMERIC,
  commission_paid BOOLEAN DEFAULT false,
  commission_paid_at TIMESTAMPTZ,
  assigned_to UUID,
  created_by UUID NOT NULL,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "bank_partners_workspace_access" ON public.bank_partners FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "financial_profiles_workspace_access" ON public.financial_profiles FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "credit_proposals_workspace_access" ON public.credit_proposals FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_partners_workspace ON public.bank_partners(workspace_id);
CREATE INDEX IF NOT EXISTS idx_financial_profiles_workspace ON public.financial_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credit_proposals_workspace ON public.credit_proposals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credit_proposals_status ON public.credit_proposals(status);