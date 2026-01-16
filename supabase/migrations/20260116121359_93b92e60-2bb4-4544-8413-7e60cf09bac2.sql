
-- Create entity_type enum for contacts
DO $$ BEGIN
  CREATE TYPE public.contact_entity_type AS ENUM ('consumidor_final', 'eni', 'empresa');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new fields to contacts table for ENI support
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS entity_type text DEFAULT 'consumidor_final',
  -- Professional Profile (ENI)
  ADD COLUMN IF NOT EXISTS cae_code text,
  ADD COLUMN IF NOT EXISTS cae_description text,
  ADD COLUMN IF NOT EXISTS business_area text,
  ADD COLUMN IF NOT EXISTS fiscal_regime text,
  ADD COLUMN IF NOT EXISTS activity_start_date date,
  ADD COLUMN IF NOT EXISTS client_types text DEFAULT 'ambos',
  -- Address
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Portugal',
  ADD COLUMN IF NOT EXISTS is_fiscal_address boolean DEFAULT true,
  -- Commercial Profile
  ADD COLUMN IF NOT EXISTS client_status text DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS client_since date,
  ADD COLUMN IF NOT EXISTS abc_category text,
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS commercial_name text,
  ADD COLUMN IF NOT EXISTS has_whatsapp boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  -- Financial
  ADD COLUMN IF NOT EXISTS payment_conditions text,
  ADD COLUMN IF NOT EXISTS preferred_payment_method text,
  ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2),
  ADD COLUMN IF NOT EXISTS credit_active boolean DEFAULT false,
  -- Commercial History (auto-calculated)
  ADD COLUMN IF NOT EXISTS total_revenue numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_2024 numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_2025 numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_ticket numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_purchase_date date;

-- Create contact_documents table
CREATE TABLE IF NOT EXISTS public.contact_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text,
  file_size integer,
  notes text,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contact_documents
ALTER TABLE public.contact_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_documents
CREATE POLICY "Users can view documents in their workspace"
  ON public.contact_documents FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create documents in their workspace"
  ON public.contact_documents FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update documents in their workspace"
  ON public.contact_documents FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete documents in their workspace"
  ON public.contact_documents FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Create contact_products table for product/training relationships
CREATE TABLE IF NOT EXISTS public.contact_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status text DEFAULT 'ativo',
  acquisition_date date,
  expiry_date date,
  quantity integer DEFAULT 1,
  unit_price numeric(12,2),
  total_value numeric(12,2),
  notes text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, product_id)
);

-- Enable RLS on contact_products
ALTER TABLE public.contact_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_products
CREATE POLICY "Users can view contact_products in their workspace"
  ON public.contact_products FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create contact_products in their workspace"
  ON public.contact_products FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update contact_products in their workspace"
  ON public.contact_products FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete contact_products in their workspace"
  ON public.contact_products FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_entity_type ON public.contacts(entity_type);
CREATE INDEX IF NOT EXISTS idx_contacts_client_status ON public.contacts(client_status);
CREATE INDEX IF NOT EXISTS idx_contacts_abc_category ON public.contacts(abc_category);
CREATE INDEX IF NOT EXISTS idx_contact_documents_contact_id ON public.contact_documents(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_products_contact_id ON public.contact_products(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_products_product_id ON public.contact_products(product_id);
