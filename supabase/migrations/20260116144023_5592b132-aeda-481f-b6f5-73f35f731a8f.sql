-- Create consumption_logs table for tracking individual consumption events
CREATE TABLE public.consumption_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  acquired_product_id UUID NOT NULL REFERENCES public.contact_products(id) ON DELETE CASCADE,
  consumption_type TEXT NOT NULL DEFAULT 'session',
  quantity INTEGER NOT NULL DEFAULT 1,
  consumption_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- manual, automation, schedule
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure either contact or company is set
  CONSTRAINT consumption_client_required CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL)
);

-- Create indexes for efficient queries
CREATE INDEX idx_consumption_logs_workspace ON public.consumption_logs(workspace_id);
CREATE INDEX idx_consumption_logs_contact ON public.consumption_logs(contact_id);
CREATE INDEX idx_consumption_logs_company ON public.consumption_logs(company_id);
CREATE INDEX idx_consumption_logs_acquired_product ON public.consumption_logs(acquired_product_id);
CREATE INDEX idx_consumption_logs_date ON public.consumption_logs(consumption_date DESC);

-- Enable RLS
ALTER TABLE public.consumption_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view consumption logs in their workspace"
ON public.consumption_logs
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert consumption logs in their workspace"
ON public.consumption_logs
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- No delete policy - consumption logs should never be deleted (audit trail)
-- No update policy - consumption logs are immutable

-- Create trigger function to auto-increment consumed_quantity on acquired product
CREATE OR REPLACE FUNCTION public.increment_consumed_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the consumed_quantity on the acquired product
  UPDATE public.contact_products
  SET consumed_quantity = COALESCE(consumed_quantity, 0) + NEW.quantity
  WHERE id = NEW.acquired_product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER on_consumption_log_created
AFTER INSERT ON public.consumption_logs
FOR EACH ROW
EXECUTE FUNCTION public.increment_consumed_quantity();

-- Add comment
COMMENT ON TABLE public.consumption_logs IS 'Immutable log of all consumption events. Each entry increments the consumed_quantity on the acquired product.';