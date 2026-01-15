-- Add AI analysis fields to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS ai_temperature text DEFAULT 'cold' CHECK (ai_temperature IN ('cold', 'warm', 'hot')),
ADD COLUMN IF NOT EXISTS contact_score integer DEFAULT 0 CHECK (contact_score >= 0 AND contact_score <= 100),
ADD COLUMN IF NOT EXISTS ai_next_action text,
ADD COLUMN IF NOT EXISTS ai_next_action_type text CHECK (ai_next_action_type IN ('reply_manual', 'send_template', 'create_opportunity', 'activate_automation', 'archive', 'follow_up', 'schedule_meeting')),
ADD COLUMN IF NOT EXISTS ai_insight text,
ADD COLUMN IF NOT EXISTS ai_contact_type text CHECK (ai_contact_type IN ('decision_maker', 'influencer', 'champion', 'blocker', 'end_user', 'unknown')),
ADD COLUMN IF NOT EXISTS estimated_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_probability integer DEFAULT 0 CHECK (conversion_probability >= 0 AND conversion_probability <= 100),
ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS automation_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_contact_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS source text;

-- Add AI analysis fields to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS ai_temperature text DEFAULT 'cold' CHECK (ai_temperature IN ('cold', 'warm', 'hot')),
ADD COLUMN IF NOT EXISTS company_score integer DEFAULT 0 CHECK (company_score >= 0 AND company_score <= 100),
ADD COLUMN IF NOT EXISTS ai_next_action text,
ADD COLUMN IF NOT EXISTS ai_next_action_type text CHECK (ai_next_action_type IN ('reply_manual', 'send_template', 'create_opportunity', 'activate_automation', 'archive', 'follow_up', 'schedule_meeting')),
ADD COLUMN IF NOT EXISTS ai_insight text,
ADD COLUMN IF NOT EXISTS ai_company_type text CHECK (ai_company_type IN ('prospect', 'client', 'partner', 'competitor', 'vendor', 'unknown')),
ADD COLUMN IF NOT EXISTS estimated_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_probability integer DEFAULT 0 CHECK (conversion_probability >= 0 AND conversion_probability <= 100),
ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS automation_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_contact_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS annual_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS employee_count integer;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contacts_temperature ON public.contacts(ai_temperature);
CREATE INDEX IF NOT EXISTS idx_contacts_score ON public.contacts(contact_score);
CREATE INDEX IF NOT EXISTS idx_companies_temperature ON public.companies(ai_temperature);
CREATE INDEX IF NOT EXISTS idx_companies_score ON public.companies(company_score);