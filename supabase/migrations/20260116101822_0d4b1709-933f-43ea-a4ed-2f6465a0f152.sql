-- Create demo_leads table for landing page conversions
CREATE TABLE public.demo_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  business_type TEXT NOT NULL,
  business_type_other TEXT,
  objectives TEXT[] NOT NULL DEFAULT '{}',
  team_size TEXT NOT NULL,
  urgency TEXT NOT NULL,
  lead_score INTEGER DEFAULT 0,
  temperature TEXT DEFAULT 'warm',
  ai_summary TEXT,
  demo_focus TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  source TEXT DEFAULT 'landing_page',
  status TEXT DEFAULT 'new',
  converted_to_lead_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for email lookups
CREATE INDEX idx_demo_leads_email ON public.demo_leads(email);

-- Add index for status filtering
CREATE INDEX idx_demo_leads_status ON public.demo_leads(status);

-- Add index for created_at ordering
CREATE INDEX idx_demo_leads_created_at ON public.demo_leads(created_at DESC);

-- Enable RLS
ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to insert (edge function uses service role)
CREATE POLICY "Service role can manage demo_leads"
ON public.demo_leads
FOR ALL
USING (true)
WITH CHECK (true);

-- Create policy for authenticated admins to view
CREATE POLICY "Authenticated users can view demo_leads"
ON public.demo_leads
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_demo_leads_updated_at
BEFORE UPDATE ON public.demo_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();