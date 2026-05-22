
-- Tabela 1:1 com empresa: plafond, rating e estado documental
CREATE TABLE public.company_financing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  plafond_amount NUMERIC(14,2),
  rating TEXT CHECK (rating IN ('A','B','C','D')),
  documentation_status TEXT NOT NULL DEFAULT 'pendente' CHECK (documentation_status IN ('pendente','ok')),
  documentation_notes TEXT,
  request_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_company_financing_workspace ON public.company_financing(workspace_id);
CREATE INDEX idx_company_financing_company ON public.company_financing(company_id);

ALTER TABLE public.company_financing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view company financing"
  ON public.company_financing FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can insert company financing"
  ON public.company_financing FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can update company financing"
  ON public.company_financing FOR UPDATE
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can delete company financing"
  ON public.company_financing FOR DELETE
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER update_company_financing_updated_at
  BEFORE UPDATE ON public.company_financing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela 1:N: simulações de contrato e mensalidades activas
CREATE TABLE public.company_financing_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label TEXT,
  operation_value NUMERIC(14,2) NOT NULL,
  payment_frequency TEXT NOT NULL DEFAULT 'mensal' CHECK (payment_frequency IN ('mensal','trimestral')),
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  installment_value NUMERIC(14,2) NOT NULL,
  interest_rate NUMERIC(6,3),
  status TEXT NOT NULL DEFAULT 'simulacao' CHECK (status IN ('simulacao','activo','concluido','cancelado')),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_cfs_workspace ON public.company_financing_simulations(workspace_id);
CREATE INDEX idx_cfs_company ON public.company_financing_simulations(company_id);
CREATE INDEX idx_cfs_status ON public.company_financing_simulations(status);

ALTER TABLE public.company_financing_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view financing simulations"
  ON public.company_financing_simulations FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can insert financing simulations"
  ON public.company_financing_simulations FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can update financing simulations"
  ON public.company_financing_simulations FOR UPDATE
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can delete financing simulations"
  ON public.company_financing_simulations FOR DELETE
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER update_cfs_updated_at
  BEFORE UPDATE ON public.company_financing_simulations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
