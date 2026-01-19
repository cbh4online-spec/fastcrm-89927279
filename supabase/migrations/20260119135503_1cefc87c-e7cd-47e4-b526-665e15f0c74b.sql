-- Create invoice_settings table
CREATE TABLE public.invoice_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Numeração
  invoice_prefix TEXT DEFAULT 'FAT-',
  next_number INTEGER DEFAULT 1,
  
  -- Dados da empresa
  company_name TEXT,
  company_nif TEXT,
  company_address TEXT,
  company_email TEXT,
  company_phone TEXT,
  company_logo_url TEXT,
  
  -- Pagamento
  default_payment_terms INTEGER DEFAULT 30,
  default_currency TEXT DEFAULT 'EUR',
  bank_name TEXT,
  iban TEXT,
  
  -- Email
  send_reminders BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 7,
  email_subject_template TEXT DEFAULT 'Fatura {invoice_number} - {company_name}',
  email_body_template TEXT DEFAULT 'Olá {client_name},

Segue em anexo a fatura {invoice_number} no valor de {total}.

Data de vencimento: {due_date}

Obrigado pela preferência!',
  
  -- Aparência
  show_logo BOOLEAN DEFAULT true,
  primary_color TEXT DEFAULT '#3b82f6',
  footer_text TEXT DEFAULT 'Obrigado pela sua preferência!',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view invoice settings in their workspace"
ON public.invoice_settings
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert invoice settings in their workspace"
ON public.invoice_settings
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update invoice settings in their workspace"
ON public.invoice_settings
FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_invoice_settings_updated_at
BEFORE UPDATE ON public.invoice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true);

-- Storage policies for company logos
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their workspace logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their workspace logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated');