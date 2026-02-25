ALTER TABLE public.automation_suggestions 
ADD COLUMN IF NOT EXISTS detected_pattern_type text;