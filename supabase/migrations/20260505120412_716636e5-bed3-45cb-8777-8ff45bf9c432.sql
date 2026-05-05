-- Add primary_module column to workspace_settings to mark a workspace as scoped to a single module (e.g., LeadChef)
ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS primary_module text;

COMMENT ON COLUMN public.workspace_settings.primary_module IS 'Optional module slug (e.g., "leadchef") indicating this workspace is scoped primarily to one module.';