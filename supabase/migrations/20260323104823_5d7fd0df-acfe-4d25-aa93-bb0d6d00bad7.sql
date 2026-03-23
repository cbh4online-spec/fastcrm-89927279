
-- Add lifecycle columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discontinued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discontinued_reason TEXT;

-- Update status column to support new workflow states
-- Current values: 'active', 'archived'
-- New values: 'draft', 'review', 'active', 'discontinued', 'archived'
-- No CHECK constraint needed as it's a text column

-- Create product_changelog table
CREATE TABLE public.product_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_changelog_product ON product_changelog(product_id, created_at DESC);
CREATE INDEX idx_product_changelog_workspace ON product_changelog(workspace_id);

ALTER TABLE product_changelog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON product_changelog
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
