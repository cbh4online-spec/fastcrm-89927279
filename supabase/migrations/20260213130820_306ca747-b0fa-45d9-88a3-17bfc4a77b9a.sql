
-- Add dynamic template fields to communication_templates
ALTER TABLE public.communication_templates 
  ADD COLUMN IF NOT EXISTS is_dynamic BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dynamic_rules JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS personalization_level TEXT DEFAULT 'basic';
