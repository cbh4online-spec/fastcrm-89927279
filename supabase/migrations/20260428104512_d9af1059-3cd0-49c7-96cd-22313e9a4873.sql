
CREATE TABLE public.builder_asset_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.builder_assets(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  label text NOT NULL,
  notes text,
  html text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT builder_asset_variants_label_check CHECK (char_length(label) BETWEEN 1 AND 80),
  CONSTRAINT builder_asset_variants_notes_check CHECK (notes IS NULL OR char_length(notes) <= 500)
);

CREATE INDEX idx_builder_asset_variants_asset ON public.builder_asset_variants(asset_id, created_at DESC);
CREATE INDEX idx_builder_asset_variants_workspace ON public.builder_asset_variants(workspace_id);

ALTER TABLE public.builder_asset_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_asset_variants_select" ON public.builder_asset_variants
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "builder_asset_variants_insert" ON public.builder_asset_variants
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "builder_asset_variants_update" ON public.builder_asset_variants
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "builder_asset_variants_delete" ON public.builder_asset_variants
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE TRIGGER set_builder_asset_variants_updated_at
  BEFORE UPDATE ON public.builder_asset_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
