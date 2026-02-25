
ALTER TABLE public.core_object_types 
  ADD COLUMN IF NOT EXISTS source_module text DEFAULT NULL;

ALTER TABLE public.core_object_types 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

COMMENT ON COLUMN public.core_object_types.source_module IS 
  'Module slug that provisioned this object type. NULL = user-created.';

COMMENT ON COLUMN public.core_object_types.is_active IS 
  'Whether this object type is active. Extensions set to false on disable.';
