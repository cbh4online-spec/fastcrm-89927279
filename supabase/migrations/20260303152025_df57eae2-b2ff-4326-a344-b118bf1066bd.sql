
-- Phase 1: Enterprise RFQ schema evolution

-- 1) Alter rfqs table - add enterprise fields
ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS rfq_number text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS delivery_location text,
  ADD COLUMN IF NOT EXISTS quote_validity_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS incoterm text,
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_email text,
  ADD COLUMN IF NOT EXISTS pdf_url text;

-- 2) Alter rfq_items table
ALTER TABLE public.rfq_items
  ADD COLUMN IF NOT EXISTS line_number integer,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'un';

-- 3) Alter rfq_suppliers table - portal auth
ALTER TABLE public.rfq_suppliers
  ADD COLUMN IF NOT EXISTS portal_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- 4) Alter rfq_quotes table - pricing detail
ALTER TABLE public.rfq_quotes
  ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_percent numeric NOT NULL DEFAULT 23,
  ADD COLUMN IF NOT EXISTS submitted_via_portal boolean NOT NULL DEFAULT false;

-- 5) Create audit log table
CREATE TABLE IF NOT EXISTS public.rfq_quote_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_quote_id uuid REFERENCES public.rfq_quotes(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL
);

-- RLS on audit log
ALTER TABLE public.rfq_quote_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view audit log"
  ON public.rfq_quote_audit_log
  FOR SELECT
  TO authenticated
  USING (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ));

-- 6) Create storage bucket for RFQ PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('rfq-pdfs', 'rfq-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: workspace members can read
CREATE POLICY "Workspace members can read rfq pdfs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'rfq-pdfs');

-- Storage RLS: authenticated users can insert
CREATE POLICY "Authenticated users can upload rfq pdfs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'rfq-pdfs');

-- Index on portal_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_rfq_suppliers_portal_token ON public.rfq_suppliers(portal_token) WHERE portal_token IS NOT NULL;
