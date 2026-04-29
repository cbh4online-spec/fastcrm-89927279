-- 1. EXTENDER products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS commercial_name TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS origin_country TEXT,
  ADD COLUMN IF NOT EXISTS distributor TEXT,
  ADD COLUMN IF NOT EXISTS volume_text TEXT,
  ADD COLUMN IF NOT EXISTS unit_of_sale TEXT,
  ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_seasonal_validation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_impulse_product BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_cross_sell BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_cross_sell_validation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_kit_candidate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_kit_candidate_validation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pending_fields JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ocr_source_document_id UUID;

-- 2. EXTENDER product_relations existente
ALTER TABLE public.product_relations
  ADD COLUMN IF NOT EXISTS relation_reason TEXT,
  ADD COLUMN IF NOT EXISTS confidence TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS validated_by UUID,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS related_product_name_suggested TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3. product_ocr_documents
CREATE TABLE IF NOT EXISTS public.product_ocr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  ocr_raw_text TEXT,
  ocr_structured_data JSONB DEFAULT '{}'::jsonb,
  ocr_confidence NUMERIC(5,2),
  field_confidence JSONB DEFAULT '{}'::jsonb,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  processing_error TEXT,
  ai_model TEXT,
  ai_tokens_used INTEGER,
  processed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pocr_docs_workspace ON public.product_ocr_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pocr_docs_product ON public.product_ocr_documents(product_id);
CREATE INDEX IF NOT EXISTS idx_pocr_docs_status ON public.product_ocr_documents(processing_status);
ALTER TABLE public.product_ocr_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ocr_docs_select" ON public.product_ocr_documents FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ocr_docs_insert" ON public.product_ocr_documents FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ocr_docs_update" ON public.product_ocr_documents FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ocr_docs_delete" ON public.product_ocr_documents FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_pocr_docs_updated BEFORE UPDATE ON public.product_ocr_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. product_content
CREATE TABLE IF NOT EXISTS public.product_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  short_title TEXT,
  seo_title TEXT,
  short_description TEXT,
  long_description TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  usage_instructions TEXT,
  precautions TEXT,
  meta_description TEXT,
  seo_keywords JSONB DEFAULT '[]'::jsonb,
  catalog_text TEXT,
  proposal_text TEXT,
  whatsapp_text TEXT,
  in_store_text TEXT,
  sensory_experience TEXT,
  olfactory_experience TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  generated_by_ai BOOLEAN DEFAULT true,
  reviewed BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);
CREATE INDEX IF NOT EXISTS idx_pcontent_workspace ON public.product_content(workspace_id);
ALTER TABLE public.product_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcontent_select" ON public.product_content FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pcontent_insert" ON public.product_content FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pcontent_update" ON public.product_content FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pcontent_delete" ON public.product_content FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_pcontent_updated BEFORE UPDATE ON public.product_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. product_sales_support
CREATE TABLE IF NOT EXISTS public.product_sales_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  positioning TEXT,
  ideal_customer TEXT,
  sales_arguments JSONB DEFAULT '[]'::jsonb,
  sensory_arguments JSONB DEFAULT '[]'::jsonb,
  olfactory_arguments JSONB DEFAULT '[]'::jsonb,
  how_to_explain TEXT,
  faqs JSONB DEFAULT '[]'::jsonb,
  objections JSONB DEFAULT '[]'::jsonb,
  sales_alerts JSONB DEFAULT '[]'::jsonb,
  do_not_sell_as JSONB DEFAULT '[]'::jsonb,
  sell_as JSONB DEFAULT '[]'::jsonb,
  counter_script TEXT,
  whatsapp_script TEXT,
  in_store_script TEXT,
  sales_team_script TEXT,
  internal_notes TEXT,
  generated_by_ai BOOLEAN DEFAULT true,
  reviewed BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);
CREATE INDEX IF NOT EXISTS idx_psales_workspace ON public.product_sales_support(workspace_id);
ALTER TABLE public.product_sales_support ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psales_select" ON public.product_sales_support FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "psales_insert" ON public.product_sales_support FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "psales_update" ON public.product_sales_support FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "psales_delete" ON public.product_sales_support FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_psales_updated BEFORE UPDATE ON public.product_sales_support FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. product_kits
CREATE TABLE IF NOT EXISTS public.product_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  kit_type TEXT DEFAULT 'kit',
  status TEXT DEFAULT 'draft',
  validation_status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'ai_suggestion',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pkits_workspace ON public.product_kits(workspace_id);
ALTER TABLE public.product_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pkits_select" ON public.product_kits FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pkits_insert" ON public.product_kits FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pkits_update" ON public.product_kits FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pkits_delete" ON public.product_kits FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_pkits_updated BEFORE UPDATE ON public.product_kits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. product_kit_items
CREATE TABLE IF NOT EXISTS public.product_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES public.product_kits(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name_suggested TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_validated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pkitems_kit ON public.product_kit_items(kit_id);
ALTER TABLE public.product_kit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pkitems_select" ON public.product_kit_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.product_kits k WHERE k.id = product_kit_items.kit_id AND public.is_workspace_member(auth.uid(), k.workspace_id)));
CREATE POLICY "pkitems_insert" ON public.product_kit_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.product_kits k WHERE k.id = product_kit_items.kit_id AND public.is_workspace_member(auth.uid(), k.workspace_id)));
CREATE POLICY "pkitems_update" ON public.product_kit_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.product_kits k WHERE k.id = product_kit_items.kit_id AND public.is_workspace_member(auth.uid(), k.workspace_id)));
CREATE POLICY "pkitems_delete" ON public.product_kit_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.product_kits k WHERE k.id = product_kit_items.kit_id AND public.is_workspace_member(auth.uid(), k.workspace_id)));

-- 8. product_validation_tasks
CREATE TABLE IF NOT EXISTS public.product_validation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT,
  current_value TEXT,
  suggested_value TEXT,
  task_type TEXT DEFAULT 'pending_field',
  validation_status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  due_date TIMESTAMPTZ,
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pvtasks_workspace ON public.product_validation_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pvtasks_product ON public.product_validation_tasks(product_id);
CREATE INDEX IF NOT EXISTS idx_pvtasks_status ON public.product_validation_tasks(validation_status);
ALTER TABLE public.product_validation_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pvtasks_select" ON public.product_validation_tasks FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pvtasks_insert" ON public.product_validation_tasks FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pvtasks_update" ON public.product_validation_tasks FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "pvtasks_delete" ON public.product_validation_tasks FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_pvtasks_updated BEFORE UPDATE ON public.product_validation_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-ocr-documents','product-ocr-documents',false,20971520,ARRAY['application/pdf','image/jpeg','image/png','image/webp','image/jpg'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ocr_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-ocr-documents' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "ocr_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-ocr-documents' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "ocr_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-ocr-documents' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "ocr_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-ocr-documents' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));