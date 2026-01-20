-- Add avatar_url column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add avatar_url column to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add avatar_url column to companies table  
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.leads.avatar_url IS 'URL of the lead profile avatar image';
COMMENT ON COLUMN public.contacts.avatar_url IS 'URL of the contact profile avatar image';
COMMENT ON COLUMN public.companies.avatar_url IS 'URL of the company logo/avatar image';