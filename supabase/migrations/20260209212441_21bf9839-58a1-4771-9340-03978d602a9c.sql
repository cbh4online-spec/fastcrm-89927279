
-- Table for tracking product page views (conversion funnel)
CREATE TABLE public.store_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_store_page_views_ws_date ON public.store_page_views(workspace_id, created_at);
CREATE INDEX idx_store_page_views_product_date ON public.store_page_views(product_id, created_at);
CREATE INDEX idx_store_page_views_session ON public.store_page_views(session_id, product_id);

-- Enable RLS
ALTER TABLE public.store_page_views ENABLE ROW LEVEL SECURITY;

-- Public insert (anonymous visitors can register views)
CREATE POLICY "Anyone can insert page views"
  ON public.store_page_views FOR INSERT
  WITH CHECK (true);

-- Only workspace members can read views
CREATE POLICY "Workspace members can view page views"
  ON public.store_page_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_page_views.workspace_id
      AND wm.user_id = auth.uid()
    )
  );
