
-- Tables
CREATE TABLE public.rfq_quote_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'pdf',
  status text NOT NULL DEFAULT 'uploaded',
  totals_json jsonb DEFAULT '{}',
  meta_json jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.rfq_quote_import_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  import_id uuid NOT NULL REFERENCES public.rfq_quote_imports(id) ON DELETE CASCADE,
  line_no int NOT NULL DEFAULT 0,
  raw_text text,
  description text,
  quantity numeric,
  unit_price numeric,
  line_total numeric,
  vat_percent numeric,
  discount_percent numeric,
  lead_time_days int,
  moq numeric,
  pack_size numeric,
  currency text DEFAULT 'EUR',
  computed_unit_price numeric,
  parse_confidence numeric DEFAULT 0,
  match_rfq_item_id uuid REFERENCES public.rfq_items(id),
  match_score numeric DEFAULT 0,
  match_method text DEFAULT 'none',
  match_status text DEFAULT 'unmatched',
  error_text text,
  normalized_json jsonb DEFAULT '{}'
);

-- Indices
CREATE INDEX idx_rqi_workspace_rfq ON public.rfq_quote_imports(workspace_id, rfq_id, supplier_id);
CREATE INDEX idx_rqil_import_status ON public.rfq_quote_import_lines(workspace_id, import_id, match_status);

-- RLS
ALTER TABLE public.rfq_quote_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_quote_import_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can manage rfq_quote_imports"
  ON public.rfq_quote_imports FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "workspace members can manage rfq_quote_import_lines"
  ON public.rfq_quote_import_lines FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('rfq-quote-files', 'rfq-quote-files', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "workspace members upload rfq quote files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'rfq-quote-files');
CREATE POLICY "workspace members read rfq quote files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'rfq-quote-files');
CREATE POLICY "workspace members delete rfq quote files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'rfq-quote-files');
