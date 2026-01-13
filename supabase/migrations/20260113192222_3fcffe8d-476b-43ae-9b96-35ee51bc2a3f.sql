-- Create landing pages table
CREATE TABLE public.landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  headline TEXT,
  subheadline TEXT,
  cta_text TEXT DEFAULT 'Get Started',
  cta_color TEXT DEFAULT '#3b82f6',
  hero_image_url TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  testimonials JSONB DEFAULT '[]'::jsonb,
  form_enabled BOOLEAN DEFAULT true,
  form_title TEXT DEFAULT 'Get in Touch',
  form_fields JSONB DEFAULT '["name", "email", "phone"]'::jsonb,
  custom_css TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

-- Enable RLS
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view landing pages in their workspaces"
ON public.landing_pages FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can create landing pages"
ON public.landing_pages FOR INSERT
WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update landing pages"
ON public.landing_pages FOR UPDATE
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete landing pages"
ON public.landing_pages FOR DELETE
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Public access for published pages (read-only by slug)
CREATE POLICY "Anyone can view published landing pages"
ON public.landing_pages FOR SELECT
USING (is_published = true);

-- Trigger for updated_at
CREATE TRIGGER update_landing_pages_updated_at
BEFORE UPDATE ON public.landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();