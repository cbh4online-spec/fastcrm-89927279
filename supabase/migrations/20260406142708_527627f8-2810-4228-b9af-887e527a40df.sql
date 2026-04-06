-- Add proactive_rules JSONB column to widget_configurations
ALTER TABLE public.widget_configurations
ADD COLUMN IF NOT EXISTS proactive_rules jsonb DEFAULT '[]'::jsonb;