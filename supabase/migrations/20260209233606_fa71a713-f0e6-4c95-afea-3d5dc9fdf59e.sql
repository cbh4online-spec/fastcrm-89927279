
-- ===========================================
-- FISCAL MODULE: Document Series, VAT Rules, Document Types
-- ===========================================

-- 1. Document Series (Séries de faturação certificadas)
CREATE TABLE public.document_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'simplified_invoice', 'credit_note', 'receipt', 'debit_note', 'proforma')),
  series_prefix TEXT NOT NULL, -- e.g. FT, FS, NC, RC
  series_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  current_number INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, series_prefix, series_year)
);

-- 2. VAT Rules (Regras de IVA contextual)
CREATE TABLE public.vat_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'PT', -- ISO 3166-1 alpha-2
  client_type TEXT NOT NULL DEFAULT 'b2c' CHECK (client_type IN ('b2c', 'b2b_national', 'b2b_eu', 'b2b_extra_eu', 'exempt')),
  rate NUMERIC(5,2) NOT NULL DEFAULT 23,
  rate_type TEXT NOT NULL DEFAULT 'standard' CHECK (rate_type IN ('standard', 'intermediate', 'reduced', 'exempt', 'reverse_charge')),
  exemption_reason TEXT, -- Legal basis for exemption (e.g. Art. 9º CIVA)
  applies_to_products BOOLEAN NOT NULL DEFAULT true,
  applies_to_services BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0, -- Higher = checked first
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Extend invoices table for fiscal compliance
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES public.document_series(id),
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'b2c',
  ADD COLUMN IF NOT EXISTS client_country TEXT DEFAULT 'PT',
  ADD COLUMN IF NOT EXISTS client_nif_validated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_exemption_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_reverse_charge BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS related_invoice_id UUID REFERENCES public.invoices(id), -- For credit notes
  ADD COLUMN IF NOT EXISTS hash_control TEXT, -- For SAF-T certification
  ADD COLUMN IF NOT EXISTS atcud TEXT, -- AT unique document code
  ADD COLUMN IF NOT EXISTS fiscal_status TEXT DEFAULT 'normal' CHECK (fiscal_status IN ('normal', 'cancelled', 'self_billed'));

-- 4. Extend invoice_items for per-item VAT
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS vat_exemption_reason TEXT,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_total NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_total NUMERIC(12,2) DEFAULT 0;

-- 5. Extend invoice_settings for fiscal configuration
ALTER TABLE public.invoice_settings
  ADD COLUMN IF NOT EXISTS fiscal_country TEXT DEFAULT 'PT',
  ADD COLUMN IF NOT EXISTS default_vat_rate NUMERIC(5,2) DEFAULT 23,
  ADD COLUMN IF NOT EXISTS vat_regime TEXT DEFAULT 'normal' CHECK (vat_regime IN ('normal', 'simplified', 'exempt', 'cash_accounting')),
  ADD COLUMN IF NOT EXISTS software_certificate_number TEXT,
  ADD COLUMN IF NOT EXISTS tax_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS commercial_registration TEXT,
  ADD COLUMN IF NOT EXISTS share_capital TEXT,
  ADD COLUMN IF NOT EXISTS legal_form TEXT,
  ADD COLUMN IF NOT EXISTS saft_product_id TEXT DEFAULT 'FastCRM',
  ADD COLUMN IF NOT EXISTS saft_product_version TEXT DEFAULT '1.0';

-- 6. Enable RLS
ALTER TABLE public.document_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_rules ENABLE ROW LEVEL SECURITY;

-- RLS for document_series
CREATE POLICY "Workspace members can manage document series"
  ON public.document_series FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- RLS for vat_rules
CREATE POLICY "Workspace members can manage VAT rules"
  ON public.vat_rules FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- 7. Function to generate next document number from series
CREATE OR REPLACE FUNCTION public.generate_document_number(
  p_workspace_id UUID,
  p_document_type TEXT DEFAULT 'invoice'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series RECORD;
  v_next_number INTEGER;
  v_document_number TEXT;
BEGIN
  -- Get the active default series for this document type
  SELECT * INTO v_series
  FROM public.document_series
  WHERE workspace_id = p_workspace_id
    AND document_type = p_document_type
    AND is_active = true
    AND is_default = true
    AND series_year = EXTRACT(YEAR FROM now())
  LIMIT 1;

  -- If no default series, try any active series
  IF v_series IS NULL THEN
    SELECT * INTO v_series
    FROM public.document_series
    WHERE workspace_id = p_workspace_id
      AND document_type = p_document_type
      AND is_active = true
      AND series_year = EXTRACT(YEAR FROM now())
    ORDER BY created_at
    LIMIT 1;
  END IF;

  -- If still no series, auto-create one
  IF v_series IS NULL THEN
    DECLARE
      v_prefix TEXT;
    BEGIN
      v_prefix := CASE p_document_type
        WHEN 'invoice' THEN 'FT'
        WHEN 'simplified_invoice' THEN 'FS'
        WHEN 'credit_note' THEN 'NC'
        WHEN 'receipt' THEN 'RC'
        WHEN 'debit_note' THEN 'ND'
        WHEN 'proforma' THEN 'PF'
        ELSE 'DOC'
      END;

      INSERT INTO public.document_series (workspace_id, document_type, series_prefix, series_year, current_number, is_active, is_default)
      VALUES (p_workspace_id, p_document_type, v_prefix, EXTRACT(YEAR FROM now()), 0, true, true)
      RETURNING * INTO v_series;
    END;
  END IF;

  -- Atomically increment and get next number
  UPDATE public.document_series
  SET current_number = current_number + 1, updated_at = now()
  WHERE id = v_series.id
  RETURNING current_number INTO v_next_number;

  -- Format: PREFIX YEAR/NUMBER (e.g. FT 2026/0001)
  v_document_number := v_series.series_prefix || ' ' || v_series.series_year || '/' || LPAD(v_next_number::TEXT, 4, '0');

  RETURN v_document_number;
END;
$$;

-- 8. Seed default PT VAT rules for new workspaces
-- (These will be inserted per workspace via application code)

-- 9. Indexes
CREATE INDEX idx_document_series_workspace ON public.document_series(workspace_id, document_type);
CREATE INDEX idx_vat_rules_workspace ON public.vat_rules(workspace_id, client_type);
CREATE INDEX idx_invoices_document_type ON public.invoices(document_type);
CREATE INDEX idx_invoices_series ON public.invoices(series_id);

-- 10. Updated_at triggers
CREATE TRIGGER update_document_series_updated_at
  BEFORE UPDATE ON public.document_series
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
