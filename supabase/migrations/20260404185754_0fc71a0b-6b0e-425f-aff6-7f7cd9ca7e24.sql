
-- Add price_on_request to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_on_request boolean NOT NULL DEFAULT false;

-- Create store_price_requests table
CREATE TABLE public.store_price_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_store_price_requests_workspace ON public.store_price_requests(workspace_id);
CREATE INDEX idx_store_price_requests_product ON public.store_price_requests(product_id);
CREATE INDEX idx_store_price_requests_status ON public.store_price_requests(status);

-- Enable RLS
ALTER TABLE public.store_price_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a price request (storefront visitors)
CREATE POLICY "Anyone can create price requests"
ON public.store_price_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Workspace members can view price requests
CREATE POLICY "Workspace members can view price requests"
ON public.store_price_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = store_price_requests.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Workspace members can update price requests
CREATE POLICY "Workspace members can update price requests"
ON public.store_price_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = store_price_requests.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Timestamp trigger
CREATE TRIGGER update_store_price_requests_updated_at
BEFORE UPDATE ON public.store_price_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
