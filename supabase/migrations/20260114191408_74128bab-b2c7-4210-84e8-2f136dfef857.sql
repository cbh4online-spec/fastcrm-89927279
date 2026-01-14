-- Create enum for template types
CREATE TYPE public.template_type AS ENUM ('email', 'whatsapp', 'instagram_dm', 'proposal', 'sms');

-- Create enum for template goals
CREATE TYPE public.template_goal AS ENUM ('qualification', 'follow_up', 'booking', 'closing', 'support', 'other');

-- Create enum for template tones
CREATE TYPE public.template_tone AS ENUM ('formal', 'direct', 'friendly', 'casual');

-- Create template folders table
CREATE TABLE public.template_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  parent_id UUID REFERENCES public.template_folders(id) ON DELETE SET NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create templates table
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.template_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type public.template_type NOT NULL,
  goal public.template_goal DEFAULT 'other',
  tone public.template_tone DEFAULT 'friendly',
  language TEXT DEFAULT 'pt',
  content TEXT NOT NULL,
  rich_content JSONB,
  subject TEXT,
  tags TEXT[] DEFAULT '{}',
  compatible_modules TEXT[] DEFAULT '{}',
  required_variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  reply_rate NUMERIC(5,2),
  click_rate NUMERIC(5,2),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template versions table for versioning
CREATE TABLE public.template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  rich_content JSONB,
  subject TEXT,
  change_summary TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_folders
CREATE POLICY "Users can view template folders in their workspace"
ON public.template_folders FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can create template folders"
ON public.template_folders FOR INSERT
WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can update template folders"
ON public.template_folders FOR UPDATE
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete template folders"
ON public.template_folders FOR DELETE
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- RLS Policies for templates
CREATE POLICY "Users can view templates in their workspace"
ON public.templates FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can create templates"
ON public.templates FOR INSERT
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update templates"
ON public.templates FOR UPDATE
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete templates"
ON public.templates FOR DELETE
USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- RLS Policies for template_versions
CREATE POLICY "Users can view template versions in their workspace"
ON public.template_versions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.templates t
  WHERE t.id = template_id
  AND public.is_workspace_member(auth.uid(), t.workspace_id)
));

CREATE POLICY "Members can create template versions"
ON public.template_versions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.templates t
  WHERE t.id = template_id
  AND public.is_workspace_member(auth.uid(), t.workspace_id)
));

-- Indexes for performance
CREATE INDEX idx_templates_workspace ON public.templates(workspace_id);
CREATE INDEX idx_templates_folder ON public.templates(folder_id);
CREATE INDEX idx_templates_type ON public.templates(type);
CREATE INDEX idx_templates_search ON public.templates USING gin(to_tsvector('portuguese', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_template_versions_template ON public.template_versions(template_id);
CREATE INDEX idx_template_folders_workspace ON public.template_folders(workspace_id);

-- Triggers for updated_at
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_folders_updated_at
BEFORE UPDATE ON public.template_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();