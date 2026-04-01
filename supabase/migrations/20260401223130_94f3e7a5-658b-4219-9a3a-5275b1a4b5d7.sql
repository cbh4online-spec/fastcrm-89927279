
-- Create landing_page_sections table for native builder blocks
CREATE TABLE public.landing_page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  section_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  auto_generated BOOLEAN DEFAULT false,
  source_import_id UUID,
  source_section_type TEXT,
  mapping_confidence TEXT,
  mapping_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for ordered loading
CREATE INDEX idx_landing_page_sections_page_order 
  ON public.landing_page_sections(landing_page_id, sort_order);

-- Enable RLS
ALTER TABLE public.landing_page_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as landing_pages)
CREATE POLICY "Members can view sections in their workspace"
  ON public.landing_page_sections FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can create sections"
  ON public.landing_page_sections FOR INSERT
  WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can update sections"
  ON public.landing_page_sections FOR UPDATE
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete sections"
  ON public.landing_page_sections FOR DELETE
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Trigger for updated_at
CREATE TRIGGER update_landing_page_sections_updated_at
  BEFORE UPDATE ON public.landing_page_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
