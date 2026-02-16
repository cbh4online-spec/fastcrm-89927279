
-- Create vertical_templates table
CREATE TABLE public.vertical_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  nome text NOT NULL,
  dor_principal text NOT NULL DEFAULT '',
  resultado_prometido text NOT NULL DEFAULT '',
  dores jsonb NOT NULL DEFAULT '[]'::jsonb,
  modulos_ativos jsonb NOT NULL DEFAULT '[]'::jsonb,
  antes_depois jsonb NOT NULL DEFAULT '{"antes":[],"depois":[]}'::jsonb,
  roi_exemplo jsonb NOT NULL DEFAULT '{"clientes_extra":0,"valor_medio":0,"periodo":"mês"}'::jsonb,
  cores jsonb NOT NULL DEFAULT '{"primaria":"hsl(221, 83%, 53%)","accent":"hsl(250, 83%, 60%)"}'::jsonb,
  cta_principal text NOT NULL DEFAULT 'Agendar Diagnóstico Estratégico',
  cta_secundario text NOT NULL DEFAULT 'Receber Plano Personalizado',
  ai_persona_nome text NOT NULL DEFAULT '',
  seo jsonb NOT NULL DEFAULT '{"title":"","description":"","canonical":""}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(workspace_id, slug)
);

-- Enable RLS
ALTER TABLE public.vertical_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view vertical templates"
  ON public.vertical_templates FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can create vertical templates"
  ON public.vertical_templates FOR INSERT
  WITH CHECK (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can update vertical templates"
  ON public.vertical_templates FOR UPDATE
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete vertical templates"
  ON public.vertical_templates FOR DELETE
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Public read for published templates (for public landing pages)
CREATE POLICY "Anyone can view published vertical templates"
  ON public.vertical_templates FOR SELECT
  USING (is_published = true);

-- Trigger for updated_at
CREATE TRIGGER update_vertical_templates_updated_at
  BEFORE UPDATE ON public.vertical_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
