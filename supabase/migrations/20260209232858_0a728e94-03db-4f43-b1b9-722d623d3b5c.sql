
-- Return Requests table
CREATE TABLE public.return_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  request_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'cancelled')),
  return_type TEXT NOT NULL DEFAULT 'full' CHECK (return_type IN ('full', 'partial')),
  reason TEXT NOT NULL,
  reason_category TEXT CHECK (reason_category IN ('defective', 'wrong_item', 'not_as_described', 'changed_mind', 'duplicate', 'other')),
  customer_notes TEXT,
  admin_notes TEXT,
  refund_amount NUMERIC(12,2),
  stripe_refund_id TEXT,
  requested_by TEXT NOT NULL CHECK (requested_by IN ('client', 'admin')),
  requested_by_user_id UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Return Request Items (for partial returns)
CREATE TABLE public.return_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_request_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for return_requests
CREATE POLICY "Workspace members can view return requests"
  ON public.return_requests FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Workspace members can insert return requests"
  ON public.return_requests FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Workspace members can update return requests"
  ON public.return_requests FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Store customers can view their own return requests
CREATE POLICY "Store customers can view own return requests"
  ON public.return_requests FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.store_orders WHERE user_id = auth.uid()
    )
  );

-- Store customers can create return requests for their orders
CREATE POLICY "Store customers can create return requests"
  ON public.return_requests FOR INSERT
  WITH CHECK (
    requested_by = 'client' AND
    order_id IN (
      SELECT id FROM public.store_orders WHERE user_id = auth.uid()
    )
  );

-- RLS policies for return_request_items
CREATE POLICY "Workspace members can manage return items"
  ON public.return_request_items FOR ALL
  USING (return_request_id IN (
    SELECT id FROM public.return_requests WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Store customers can view own return items"
  ON public.return_request_items FOR SELECT
  USING (return_request_id IN (
    SELECT rr.id FROM public.return_requests rr
    JOIN public.store_orders so ON rr.order_id = so.id
    WHERE so.user_id = auth.uid()
  ));

CREATE POLICY "Store customers can create return items"
  ON public.return_request_items FOR INSERT
  WITH CHECK (return_request_id IN (
    SELECT rr.id FROM public.return_requests rr
    JOIN public.store_orders so ON rr.order_id = so.id
    WHERE so.user_id = auth.uid()
  ));

-- Auto-generate return request number
CREATE OR REPLACE FUNCTION public.generate_return_request_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 'DEV-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.return_requests
  WHERE workspace_id = NEW.workspace_id;
  
  NEW.request_number := 'DEV-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_generate_return_number
  BEFORE INSERT ON public.return_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_return_request_number();

-- Updated_at trigger
CREATE TRIGGER update_return_requests_updated_at
  BEFORE UPDATE ON public.return_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_return_requests_order ON public.return_requests(order_id);
CREATE INDEX idx_return_requests_workspace ON public.return_requests(workspace_id);
CREATE INDEX idx_return_requests_status ON public.return_requests(status);
