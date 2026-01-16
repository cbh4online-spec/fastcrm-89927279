-- Add company_id and consumed_quantity to contact_products table
-- Also rename to client_products for clarity (keeping contact_products as alias)

-- Add new columns
ALTER TABLE public.contact_products 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS consumed_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchased_quantity INTEGER DEFAULT 1;

-- Make contact_id nullable (since we can have either contact OR company)
ALTER TABLE public.contact_products ALTER COLUMN contact_id DROP NOT NULL;

-- Add check constraint to ensure either contact_id or company_id is set
ALTER TABLE public.contact_products 
ADD CONSTRAINT contact_or_company_required 
CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL);

-- Create index for company lookups
CREATE INDEX IF NOT EXISTS idx_contact_products_company_id ON public.contact_products(company_id);

-- Update status to use consistent values
COMMENT ON COLUMN public.contact_products.status IS 'Status: ativo, em_consumo, concluido, expirado';

-- Add RLS policy for company access
CREATE POLICY "Users can view company products in their workspace"
ON public.contact_products
FOR SELECT
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert company products in their workspace"
ON public.contact_products
FOR INSERT
WITH CHECK (
  company_id IS NULL OR company_id IN (
    SELECT id FROM public.companies WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update company products in their workspace"
ON public.contact_products
FOR UPDATE
USING (
  company_id IS NULL OR company_id IN (
    SELECT id FROM public.companies WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete company products in their workspace"
ON public.contact_products
FOR DELETE
USING (
  company_id IS NULL OR company_id IN (
    SELECT id FROM public.companies WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
);

-- Create function to auto-update status based on consumption
CREATE OR REPLACE FUNCTION public.update_product_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate status based on consumed vs purchased
  IF NEW.consumed_quantity >= COALESCE(NEW.purchased_quantity, NEW.quantity, 1) THEN
    NEW.status := 'concluido';
  ELSIF NEW.consumed_quantity > 0 THEN
    NEW.status := 'em_consumo';
  ELSIF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < NOW() THEN
    NEW.status := 'expirado';
  ELSE
    NEW.status := 'ativo';
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto-status updates
DROP TRIGGER IF EXISTS update_product_status_trigger ON public.contact_products;
CREATE TRIGGER update_product_status_trigger
BEFORE INSERT OR UPDATE OF consumed_quantity, purchased_quantity, quantity, expiry_date
ON public.contact_products
FOR EACH ROW
EXECUTE FUNCTION public.update_product_status();