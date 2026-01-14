-- =============================================
-- CUSTOM FIELDS SUPPORT FOR CRM
-- =============================================

-- 1) CUSTOM FIELDS DEFINITIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('lead', 'opportunity')),
  name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select')),
  options jsonb DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure unique field names per entity type per workspace
  UNIQUE(workspace_id, entity_type, name)
);

-- Indexes for custom_fields
CREATE INDEX IF NOT EXISTS idx_custom_fields_workspace ON public.custom_fields(workspace_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity_type ON public.custom_fields(workspace_id, entity_type);

-- Enable RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_fields
CREATE POLICY "Members can view custom fields" ON public.custom_fields
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can create custom fields" ON public.custom_fields
  FOR INSERT WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can update custom fields" ON public.custom_fields
  FOR UPDATE USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete custom fields" ON public.custom_fields
  FOR DELETE USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Trigger for updated_at
CREATE TRIGGER update_custom_fields_updated_at
  BEFORE UPDATE ON public.custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2) CUSTOM FIELD VALUES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  custom_field_id uuid NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure one value per field per entity
  UNIQUE(custom_field_id, entity_id)
);

-- Indexes for custom_field_values
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON public.custom_field_values(custom_field_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON public.custom_field_values(entity_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_value ON public.custom_field_values USING GIN(value);

-- Enable RLS
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_field_values
-- Members can view values if they can view the custom field
CREATE POLICY "Members can view custom field values" ON public.custom_field_values
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.custom_fields cf
      WHERE cf.id = custom_field_values.custom_field_id
      AND is_workspace_member(auth.uid(), cf.workspace_id)
    )
  );

-- Members can manage values
CREATE POLICY "Members can create custom field values" ON public.custom_field_values
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_fields cf
      WHERE cf.id = custom_field_values.custom_field_id
      AND is_workspace_member(auth.uid(), cf.workspace_id)
    )
  );

CREATE POLICY "Members can update custom field values" ON public.custom_field_values
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.custom_fields cf
      WHERE cf.id = custom_field_values.custom_field_id
      AND is_workspace_member(auth.uid(), cf.workspace_id)
    )
  );

CREATE POLICY "Members can delete custom field values" ON public.custom_field_values
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.custom_fields cf
      WHERE cf.id = custom_field_values.custom_field_id
      AND is_workspace_member(auth.uid(), cf.workspace_id)
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_custom_field_values_updated_at
  BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();