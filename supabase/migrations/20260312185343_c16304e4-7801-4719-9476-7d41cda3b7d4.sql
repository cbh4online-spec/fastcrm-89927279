
-- Create invoice_payments table
CREATE TABLE public.invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice payments in their workspace"
  ON public.invoice_payments FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert invoice payments in their workspace"
  ON public.invoice_payments FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete invoice payments in their workspace"
  ON public.invoice_payments FOR DELETE
  TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_workspace_id ON public.invoice_payments(workspace_id);
