-- Add new columns to custom_fields for Field Manager
ALTER TABLE public.custom_fields 
ADD COLUMN IF NOT EXISTS label TEXT,
ADD COLUMN IF NOT EXISTS internal_name TEXT,
ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS formatting_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS auto_format BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS industry_labels JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"view": [], "edit": []}'::jsonb,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Create audit log for field changes
CREATE TABLE IF NOT EXISTS public.custom_field_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id UUID REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_field_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit logs
CREATE POLICY "Users can view audit logs for their workspace"
  ON public.custom_field_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can insert audit logs for their workspace"
  ON public.custom_field_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity_visible 
  ON public.custom_fields(workspace_id, entity_type, is_visible);

CREATE INDEX IF NOT EXISTS idx_custom_field_audit_logs_field 
  ON public.custom_field_audit_logs(custom_field_id);

-- Update existing fields to have label = name if label is null
UPDATE public.custom_fields 
SET label = name,
    internal_name = LOWER(REPLACE(name, ' ', '_'))
WHERE label IS NULL;