-- Update invoices status check to include partially_paid
ALTER TABLE public.invoices DROP CONSTRAINT invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'));