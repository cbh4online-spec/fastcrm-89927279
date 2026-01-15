-- Add contact_id and company_id to conversations for CRM linkage
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_message_preview TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_company_id ON public.conversations(company_id);

-- Update RLS policies to allow reading contact/company info
-- (existing policies should already cover this as they're workspace-based)