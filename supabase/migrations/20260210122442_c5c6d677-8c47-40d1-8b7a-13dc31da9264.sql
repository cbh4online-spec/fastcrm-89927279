
-- Create store_faqs table
CREATE TABLE public.store_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_faqs_workspace ON public.store_faqs(workspace_id);

-- Enable RLS
ALTER TABLE public.store_faqs ENABLE ROW LEVEL SECURITY;

-- Public read for active FAQs (storefront)
CREATE POLICY "Anyone can view active FAQs"
  ON public.store_faqs FOR SELECT
  USING (is_active = true);

-- Workspace members can manage FAQs
CREATE POLICY "Workspace members can insert FAQs"
  ON public.store_faqs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_faqs.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update FAQs"
  ON public.store_faqs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_faqs.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete FAQs"
  ON public.store_faqs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_faqs.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_store_faqs_updated_at
  BEFORE UPDATE ON public.store_faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
