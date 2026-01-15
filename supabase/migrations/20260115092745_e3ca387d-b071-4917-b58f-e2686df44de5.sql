-- Add new trigger types to the automation_trigger enum
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'tag_added';
ALTER TYPE public.automation_trigger ADD VALUE IF NOT EXISTS 'tag_removed';