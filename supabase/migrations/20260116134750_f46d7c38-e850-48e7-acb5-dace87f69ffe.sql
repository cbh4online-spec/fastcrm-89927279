-- Form Builder - New optimized structure

-- Main form_definitions table
CREATE TABLE public.form_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT,
  form_type TEXT NOT NULL DEFAULT 'lead',
  target_entity TEXT NOT NULL DEFAULT 'contact',
  industry_type TEXT DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'draft',
  schema JSONB NOT NULL DEFAULT '{"sections": [], "fields": [], "settings": {}}'::jsonb,
  conditional_logic JSONB DEFAULT '[]'::jsonb,
  submission_actions JSONB DEFAULT '{"createContact": true, "createOpportunity": false, "tags": [], "redirectUrl": null, "webhooks": []}'::jsonb,
  success_message TEXT DEFAULT 'Obrigado pela submissão!',
  styling JSONB DEFAULT '{"theme": "default", "primaryColor": null}'::jsonb,
  is_public BOOLEAN DEFAULT true,
  submissions_count INTEGER DEFAULT 0,
  last_submission_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form fields (for flexible field configuration per form)
CREATE TABLE public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.form_definitions(id) ON DELETE CASCADE NOT NULL,
  custom_field_id UUID REFERENCES public.custom_fields(id) ON DELETE SET NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  placeholder TEXT,
  help_text TEXT,
  is_required BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  section TEXT DEFAULT 'default',
  position INTEGER DEFAULT 0,
  options JSONB,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  formatting_config JSONB DEFAULT '{"autoFormat": true}'::jsonb,
  conditional_visibility JSONB,
  width TEXT DEFAULT 'full',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form submissions enhanced
CREATE TABLE public.form_builder_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.form_definitions(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_data JSONB,
  created_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  created_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  processing_status TEXT DEFAULT 'pending',
  processing_errors JSONB,
  ai_summary TEXT,
  ai_score INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Form templates (reusable templates)
CREATE TABLE public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  form_type TEXT NOT NULL,
  industry_type TEXT,
  schema JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Form version history (for audit)
CREATE TABLE public.form_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.form_definitions(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  schema JSONB NOT NULL,
  changed_by UUID,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_builder_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_definitions
CREATE POLICY "Users can view forms in their workspace"
  ON public.form_definitions FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can create forms in their workspace"
  ON public.form_definitions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update forms in their workspace"
  ON public.form_definitions FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can delete forms in their workspace"
  ON public.form_definitions FOR DELETE
  TO authenticated
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- RLS Policies for form_fields
CREATE POLICY "Users can manage form fields"
  ON public.form_fields FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.form_definitions fd
    WHERE fd.id = form_id AND public.is_workspace_member(auth.uid(), fd.workspace_id)
  ));

-- RLS Policies for form_builder_submissions
CREATE POLICY "Users can view submissions in their workspace"
  ON public.form_builder_submissions FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Anyone can insert submissions for public forms"
  ON public.form_builder_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.form_definitions fd
    WHERE fd.id = form_id AND fd.is_public = true AND fd.status = 'active'
  ));

-- RLS Policies for form_templates
CREATE POLICY "Users can view templates"
  ON public.form_templates FOR SELECT
  TO authenticated
  USING (
    is_system = true 
    OR is_public = true 
    OR (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can create templates in their workspace"
  ON public.form_templates FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id));

-- RLS Policies for form_versions
CREATE POLICY "Users can view form versions"
  ON public.form_versions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.form_definitions fd
    WHERE fd.id = form_id AND public.is_workspace_member(auth.uid(), fd.workspace_id)
  ));

-- Indexes for performance
CREATE INDEX idx_form_definitions_workspace ON public.form_definitions(workspace_id);
CREATE INDEX idx_form_definitions_status ON public.form_definitions(status);
CREATE INDEX idx_form_definitions_slug ON public.form_definitions(slug);
CREATE INDEX idx_form_fields_form ON public.form_fields(form_id);
CREATE INDEX idx_form_fields_position ON public.form_fields(form_id, position);
CREATE INDEX idx_form_builder_submissions_form ON public.form_builder_submissions(form_id);
CREATE INDEX idx_form_builder_submissions_workspace ON public.form_builder_submissions(workspace_id);

-- Function to update submission count
CREATE OR REPLACE FUNCTION public.update_form_submission_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.form_definitions
  SET submissions_count = submissions_count + 1,
      last_submission_at = NEW.submitted_at
  WHERE id = NEW.form_id;
  RETURN NEW;
END;
$$;

-- Trigger for submission count
CREATE TRIGGER on_form_submission_insert
  AFTER INSERT ON public.form_builder_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_form_submission_count();

-- Insert default system templates
INSERT INTO public.form_templates (name, description, form_type, industry_type, schema, is_system, is_public)
VALUES
  ('Formulário de Contacto', 'Formulário básico de contacto', 'lead', 'default', 
   '{"sections": [{"id": "main", "title": "Informações de Contacto"}], "fields": [{"key": "name", "label": "Nome", "type": "text", "required": true}, {"key": "email", "label": "Email", "type": "email", "required": true}, {"key": "phone", "label": "Telefone", "type": "phone"}, {"key": "message", "label": "Mensagem", "type": "textarea"}]}'::jsonb,
   true, true),
  ('Inscrição Formação', 'Formulário de inscrição para cursos', 'lead', 'formacao',
   '{"sections": [{"id": "personal", "title": "Dados Pessoais"}, {"id": "course", "title": "Informações do Curso"}], "fields": [{"key": "name", "label": "Nome Completo", "type": "text", "required": true, "section": "personal"}, {"key": "email", "label": "Email", "type": "email", "required": true, "section": "personal"}, {"key": "phone", "label": "Telefone", "type": "phone", "section": "personal"}, {"key": "course_interest", "label": "Curso Pretendido", "type": "select", "section": "course"}, {"key": "modality", "label": "Modalidade", "type": "select", "options": ["Presencial", "Online", "Híbrido"], "section": "course"}]}'::jsonb,
   true, true),
  ('Pedido de Consulta', 'Formulário para agendamento de consultas', 'lead', 'saude',
   '{"sections": [{"id": "patient", "title": "Dados do Paciente"}, {"id": "appointment", "title": "Consulta"}], "fields": [{"key": "name", "label": "Nome do Paciente", "type": "text", "required": true, "section": "patient"}, {"key": "email", "label": "Email", "type": "email", "section": "patient"}, {"key": "phone", "label": "Telefone", "type": "phone", "required": true, "section": "patient"}, {"key": "specialty", "label": "Especialidade", "type": "select", "section": "appointment"}, {"key": "preferred_date", "label": "Data Preferida", "type": "date", "section": "appointment"}, {"key": "notes", "label": "Observações", "type": "textarea", "section": "appointment"}]}'::jsonb,
   true, true);