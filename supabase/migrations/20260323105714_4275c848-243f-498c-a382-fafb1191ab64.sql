
-- Product tags table
CREATE TABLE public.product_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, tag)
);

CREATE INDEX idx_product_tags_product ON product_tags(product_id);
CREATE INDEX idx_product_tags_workspace_tag ON product_tags(workspace_id, tag);
CREATE INDEX idx_product_tags_tag ON product_tags(tag);

ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON product_tags
  FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));
