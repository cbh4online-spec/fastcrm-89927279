
-- =============================================
-- Portal B2B 2.0 - Phase 4: Contracts & SLAs
-- =============================================

-- 1. Contract status enum
CREATE TYPE public.contract_status AS ENUM ('draft', 'active', 'expiring', 'expired', 'cancelled', 'renewed');

-- 2. Contracts table
CREATE TABLE public.client_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'contract', -- 'contract', 'sla', 'agreement'
  status public.contract_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE,
  renewal_date DATE,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  value NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  terms JSONB DEFAULT '{}',
  description TEXT,
  document_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Company members can view their contracts
CREATE POLICY "Company members can view contracts"
ON public.client_contracts
FOR SELECT
TO authenticated
USING (
  public.is_same_client_company(auth.uid(), company_id)
);

-- Super admins / workspace owners can manage all
CREATE POLICY "Super admins can manage all contracts"
ON public.client_contracts
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Workspace members can manage contracts (CRM side)
CREATE POLICY "Workspace members can manage contracts"
ON public.client_contracts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = client_contracts.workspace_id
    AND wm.user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- 5. Trigger for updated_at
CREATE TRIGGER update_client_contracts_updated_at
BEFORE UPDATE ON public.client_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Indexes
CREATE INDEX idx_client_contracts_company ON public.client_contracts(company_id);
CREATE INDEX idx_client_contracts_workspace ON public.client_contracts(workspace_id);
CREATE INDEX idx_client_contracts_status ON public.client_contracts(status);
CREATE INDEX idx_client_contracts_end_date ON public.client_contracts(end_date);
