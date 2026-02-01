-- Create table for workspace email templates
CREATE TABLE public.workspace_email_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    template_type TEXT NOT NULL DEFAULT 'client_invitation',
    
    -- Branding
    logo_url TEXT,
    primary_color TEXT DEFAULT '#6366f1',
    secondary_color TEXT DEFAULT '#8b5cf6',
    
    -- Header
    header_title TEXT DEFAULT 'Portal de Clientes',
    
    -- Body content
    greeting_template TEXT DEFAULT 'Olá {{client_name}}!',
    intro_text TEXT DEFAULT 'Foi convidado(a) para aceder ao Portal de Clientes de {{workspace_name}}.',
    features_title TEXT DEFAULT 'No portal, poderá:',
    features_list JSONB DEFAULT '["Fazer encomendas de forma rápida e fácil", "Consultar o histórico de encomendas", "Acompanhar o estado das suas encomendas", "Gerir os seus dados de facturação"]'::jsonb,
    button_text TEXT DEFAULT 'Aceder ao Portal',
    
    -- Footer
    footer_text TEXT DEFAULT 'Este email foi enviado automaticamente por {{workspace_name}}.',
    
    -- Portal URL configuration
    custom_portal_url TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    
    UNIQUE(workspace_id, template_type)
);

-- Enable RLS
ALTER TABLE public.workspace_email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view templates for their workspaces"
ON public.workspace_email_templates
FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage templates for their workspaces"
ON public.workspace_email_templates
FOR ALL
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
)
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Add trigger for updated_at
CREATE TRIGGER update_workspace_email_templates_updated_at
BEFORE UPDATE ON public.workspace_email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_workspace_email_templates_workspace_type 
ON public.workspace_email_templates(workspace_id, template_type);