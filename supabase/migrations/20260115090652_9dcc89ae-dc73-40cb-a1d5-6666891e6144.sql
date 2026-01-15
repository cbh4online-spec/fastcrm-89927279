-- Add entity linking columns to templates table
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS linked_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_templates_linked_contact ON public.templates(linked_contact_id) WHERE linked_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_linked_company ON public.templates(linked_company_id) WHERE linked_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_linked_opportunity ON public.templates(linked_opportunity_id) WHERE linked_opportunity_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.templates.linked_contact_id IS 'Optional link to a specific contact for contextual templates';
COMMENT ON COLUMN public.templates.linked_company_id IS 'Optional link to a specific company for contextual templates';
COMMENT ON COLUMN public.templates.linked_opportunity_id IS 'Optional link to a specific opportunity for contextual templates';