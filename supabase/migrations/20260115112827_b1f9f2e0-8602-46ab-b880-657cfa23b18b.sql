-- Add AI analysis fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS ai_temperature text DEFAULT 'cold' CHECK (ai_temperature IN ('cold', 'warm', 'hot')),
ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
ADD COLUMN IF NOT EXISTS ai_next_action text,
ADD COLUMN IF NOT EXISTS ai_next_action_type text CHECK (ai_next_action_type IN ('reply_manual', 'send_template', 'create_opportunity', 'activate_automation', 'archive', 'follow_up')),
ADD COLUMN IF NOT EXISTS ai_insight text,
ADD COLUMN IF NOT EXISTS ai_lead_type text CHECK (ai_lead_type IN ('lead', 'client', 'supplier', 'spam', 'unknown')),
ADD COLUMN IF NOT EXISTS estimated_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_probability integer DEFAULT 0 CHECK (conversion_probability >= 0 AND conversion_probability <= 100),
ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS automation_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS company_name text;

-- Create index for temperature filtering
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON public.leads(ai_temperature);
CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);