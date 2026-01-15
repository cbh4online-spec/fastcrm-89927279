-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  
  -- Client references (at least one should be filled)
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Related entities
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  
  -- Client info (denormalized for PDF/display)
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,
  client_tax_id TEXT,
  
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  paid_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Amounts
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 23,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Content
  notes TEXT,
  terms TEXT,
  footer_text TEXT,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 23,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for invoice number per workspace
CREATE UNIQUE INDEX idx_invoices_number_workspace ON public.invoices(workspace_id, invoice_number);

-- Create indexes for common queries
CREATE INDEX idx_invoices_workspace ON public.invoices(workspace_id);
CREATE INDEX idx_invoices_status ON public.invoices(workspace_id, status);
CREATE INDEX idx_invoices_company ON public.invoices(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_invoices_contact ON public.invoices(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_invoices_lead ON public.invoices(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_invoices_due_date ON public.invoices(workspace_id, due_date);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Users can view invoices in their workspace"
ON public.invoices FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can create invoices in their workspace"
ON public.invoices FOR INSERT
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update invoices in their workspace"
ON public.invoices FOR UPDATE
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete invoices in their workspace"
ON public.invoices FOR DELETE
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- RLS policies for invoice items (inherit from invoice)
CREATE POLICY "Users can view invoice items"
ON public.invoice_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.invoices i 
  WHERE i.id = invoice_id 
  AND public.is_workspace_member(auth.uid(), i.workspace_id)
));

CREATE POLICY "Users can manage invoice items"
ON public.invoice_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.invoices i 
  WHERE i.id = invoice_id 
  AND public.is_workspace_member(auth.uid(), i.workspace_id)
));

-- Trigger to update updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.invoices
  WHERE workspace_id = p_workspace_id
    AND invoice_number LIKE 'FT' || v_year || '%';
  
  v_number := 'FT' || v_year || '/' || LPAD(v_count::TEXT, 5, '0');
  
  RETURN v_number;
END;
$$;

-- Function to recalculate invoice totals
CREATE OR REPLACE FUNCTION public.recalculate_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_id UUID;
  v_subtotal NUMERIC(12,2);
  v_tax_amount NUMERIC(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;
  
  -- Calculate subtotal and tax from items
  SELECT 
    COALESCE(SUM(total), 0),
    COALESCE(SUM(total * tax_rate / 100), 0)
  INTO v_subtotal, v_tax_amount
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;
  
  -- Update invoice
  UPDATE public.invoices
  SET 
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total = v_subtotal + v_tax_amount - COALESCE(discount_amount, 0),
    updated_at = now()
  WHERE id = v_invoice_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to auto-recalculate totals when items change
CREATE TRIGGER recalculate_invoice_on_items_change
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_invoice_totals();