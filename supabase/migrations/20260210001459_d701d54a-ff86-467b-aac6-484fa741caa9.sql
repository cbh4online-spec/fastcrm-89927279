
-- =============================================
-- Portal B2B 2.0 - Phase 2: Approval Flows
-- =============================================

-- 1. Approval flow types
CREATE TYPE public.approval_type AS ENUM ('purchase', 'refund', 'upgrade');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Approval flow configuration per company
CREATE TABLE public.client_approval_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  approval_type public.approval_type NOT NULL,
  min_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  requires_admin_approval BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, approval_type)
);

-- 3. Approval requests
CREATE TABLE public.client_approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL DEFAULT 'order_note',
  entity_id UUID NOT NULL,
  approval_type public.approval_type NOT NULL DEFAULT 'purchase',
  status public.approval_status NOT NULL DEFAULT 'pending',
  total_value NUMERIC(12,2) DEFAULT NULL,
  requested_by UUID NOT NULL REFERENCES public.client_users(id),
  decided_by UUID REFERENCES public.client_users(id),
  decided_at TIMESTAMPTZ,
  request_reason TEXT,
  decision_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.client_approval_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_approval_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS for client_approval_flows

-- Company members can view their flows
CREATE POLICY "Company members can view approval flows"
ON public.client_approval_flows
FOR SELECT
TO authenticated
USING (
  public.is_same_client_company(auth.uid(), company_id)
);

-- Only admins can manage flows
CREATE POLICY "Client admins can manage approval flows"
ON public.client_approval_flows
FOR ALL
TO authenticated
USING (
  public.has_client_role(auth.uid(), 'client_admin')
  AND public.is_same_client_company(auth.uid(), company_id)
);

-- Super admins
CREATE POLICY "Super admins can manage all approval flows"
ON public.client_approval_flows
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 6. RLS for client_approval_requests

-- Company members can view requests
CREATE POLICY "Company members can view approval requests"
ON public.client_approval_requests
FOR SELECT
TO authenticated
USING (
  public.is_same_client_company(auth.uid(), company_id)
);

-- Any authenticated company member can create requests
CREATE POLICY "Company members can create approval requests"
ON public.client_approval_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_same_client_company(auth.uid(), company_id)
);

-- Only admins can update (approve/reject)
CREATE POLICY "Client admins can update approval requests"
ON public.client_approval_requests
FOR UPDATE
TO authenticated
USING (
  public.has_client_role(auth.uid(), 'client_admin')
  AND public.is_same_client_company(auth.uid(), company_id)
);

-- Super admins
CREATE POLICY "Super admins can manage all approval requests"
ON public.client_approval_requests
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 7. Triggers for updated_at
CREATE TRIGGER update_client_approval_flows_updated_at
BEFORE UPDATE ON public.client_approval_flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_approval_requests_updated_at
BEFORE UPDATE ON public.client_approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Indexes
CREATE INDEX idx_approval_requests_company ON public.client_approval_requests(company_id);
CREATE INDEX idx_approval_requests_status ON public.client_approval_requests(status);
CREATE INDEX idx_approval_requests_requested_by ON public.client_approval_requests(requested_by);
CREATE INDEX idx_approval_flows_company ON public.client_approval_flows(company_id);
