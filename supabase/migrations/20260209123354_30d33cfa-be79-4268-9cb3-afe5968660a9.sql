-- Add store-related fields to products table
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS store_published boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_sort_order integer DEFAULT 0;

-- Create store_orders table for e-commerce orders
CREATE TABLE public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  customer_email text NOT NULL,
  customer_name text,
  customer_phone text,
  status text NOT NULL DEFAULT 'pending',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_total numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  stripe_session_id text,
  stripe_payment_intent_id text,
  billing_address jsonb,
  shipping_address jsonb,
  notes text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- Public can create orders (guest checkout)
CREATE POLICY "Anyone can create store orders"
  ON public.store_orders FOR INSERT
  WITH CHECK (true);

-- Workspace members can view orders
CREATE POLICY "Workspace members can view store orders"
  ON public.store_orders FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace members can update orders
CREATE POLICY "Workspace members can update store orders"
  ON public.store_orders FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Allow public read of store-published products (for the storefront)
CREATE POLICY "Public can view store-published products"
  ON public.products FOR SELECT
  USING (store_published = true);

-- Create index for store queries
CREATE INDEX IF NOT EXISTS idx_products_store_published ON public.products(store_published) WHERE store_published = true;
CREATE INDEX IF NOT EXISTS idx_store_orders_workspace ON public.store_orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_stripe ON public.store_orders(stripe_session_id);